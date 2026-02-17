<?php

loadEnvFile(__DIR__ . '/.env');

$host = '0.0.0.0';
$port = (int)(getenv('PORT') ?: getenv('WS_PORT') ?: 8080);
$null = NULL;

function loadEnvFile($path) {
    if (!is_file($path) || !is_readable($path)) {
        return;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!$lines) {
        return;
    }
    foreach ($lines as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' || strpos($trimmed, '#') === 0) {
            continue;
        }
        $parts = explode('=', $trimmed, 2);
        if (count($parts) !== 2) {
            continue;
        }
        $key = trim($parts[0]);
        $value = trim($parts[1]);
        if ($key === '') {
            continue;
        }
        if ((str_starts_with($value, '"') && str_ends_with($value, '"')) || (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
            $value = substr($value, 1, -1);
        }
        putenv("$key=$value");
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }
}

function getDB() {
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $driver = strtolower(getenv('DB_DRIVER') ?: 'pgsql');
    if ($driver !== 'pgsql') {
        throw new RuntimeException('Unsupported DB_DRIVER. Use pgsql (Supabase PostgreSQL).');
    }
    $host = getenv('DB_HOST') ?: 'db.<your-project-ref>.supabase.co';
    $port = getenv('DB_PORT') ?: '5432';
    $db   = getenv('DB_NAME') ?: 'postgres';
    $user = getenv('DB_USER') ?: 'postgres';
    $pass = getenv('DB_PASS') ?: '';
    $sslmode = getenv('DB_SSLMODE') ?: 'require';
    $dsn = "pgsql:host=$host;port=$port;dbname=$db;sslmode=$sslmode";
    $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    return $pdo;
}

function inferProductType($name, $category = '', $productType = '') {
    $explicit = strtolower(trim((string)$productType));
    if (in_array($explicit, ['coffee', 'matcha', 'pastry', 'other'], true)) {
        return $explicit;
    }

    $haystack = strtolower(trim((string)$name . ' ' . (string)$category));
    $matchaKeywords = ['matcha', 'green tea', 'uji', 'ceremonial'];
    $coffeeKeywords = ['coffee', 'espresso', 'latte', 'cappuccino', 'americano', 'mocha', 'brew', 'macchiato', 'affogato'];

    foreach ($matchaKeywords as $keyword) {
        if (strpos($haystack, $keyword) !== false) return 'matcha';
    }
    foreach ($coffeeKeywords as $keyword) {
        if (strpos($haystack, $keyword) !== false) return 'coffee';
    }
    return 'other';
}

function wsWrite($socketConn, $message) {
    global $clients, $clientSessions, $socket;
    $written = false;
    $err = 0;
    try {
        $written = @socket_write($socketConn, $message, strlen($message));
        if ($written !== false) {
            return true;
        }
        $err = @socket_last_error($socketConn);
        @socket_clear_error($socketConn);
    } catch (Throwable $e) {
        $err = 32;
    }

    if (in_array($err, [9, 32, 54, 104], true)) {
        if (isset($socket) && $socketConn !== $socket) {
            $clientId = getSocketId($socketConn);
            unset($clientSessions[$clientId]);
            $found = array_search($socketConn, $clients, true);
            if ($found !== false) {
                unset($clients[$found]);
            }
            try {
                @socket_close($socketConn);
            } catch (Throwable $e) {
            }
        }
    }
    return false;
}

$socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
socket_set_option($socket, SOL_SOCKET, SO_REUSEADDR, 1);
socket_bind($socket, $host, $port);
socket_listen($socket);
socket_set_nonblock($socket);

$clients = array($socket);
$clientSessions = [];
echo "Server started on ws://$host:$port\n";
$bootstrapPdo = getDB();
ensureSchema($bootstrapPdo);

while (true) {
    $changed = $clients;
    $ready = @socket_select($changed, $null, $null, 0, 200000);
    if ($ready === false || $ready === 0) {
        continue;
    }

    if (in_array($socket, $changed)) {
        $socket_new = socket_accept($socket);
        if ($socket_new === false) {
            $found_socket = array_search($socket, $changed);
            unset($changed[$found_socket]);
            continue;
        }
        socket_set_nonblock($socket_new);
        $header = '';
        $startedAt = microtime(true);
        while ((microtime(true) - $startedAt) < 1.5) {
            $chunk = @socket_read($socket_new, 2048);
            if (is_string($chunk) && $chunk !== '') {
                $header .= $chunk;
                if (strpos($header, "\r\n\r\n") !== false) {
                    break;
                }
            }
            usleep(10000);
        }
        $handshakeOk = perform_handshake($header, $socket_new, $host, $port);
        if ($handshakeOk) {
            $clients[] = $socket_new;
            try {
                $pdo = getDB();
                sendProductsList($pdo, $socket_new);
                sendActiveOrders($pdo, $socket_new);
                sendOrderHistory($pdo, $socket_new);
                sendSalesSummary($pdo, $socket_new);
            } catch (Throwable $e) {
                sendError($socket_new, 'Bootstrap sync failed: ' . $e->getMessage());
            }
        } else {
            @socket_close($socket_new);
        }
        $found_socket = array_search($socket, $changed);
        unset($changed[$found_socket]);
    }

    foreach ($changed as $changed_socket) {
        $buf = '';
        $bytes = @socket_recv($changed_socket, $buf, 4 * 1024 * 1024, 0);
        if ($bytes > 0) {
            $frames = decodeWebSocketFrames($buf);
            foreach ($frames as $frameText) {
                $msg_data = json_decode($frameText, true);
                if ($msg_data) {
                    handleMessage($msg_data, $changed_socket, $clients, $clientSessions);
                }
            }
            continue;
        }

        if ($bytes === 0) {
            $clientId = getSocketId($changed_socket);
            unset($clientSessions[$clientId]);
            $found_socket = array_search($changed_socket, $clients);
            unset($clients[$found_socket]);
            @socket_close($changed_socket);
        }
    }
}

function handleMessage($data, $clientSocket, $allClients, &$clientSessions) {
    $pdo = getDB();
    $type = $data['type'] ?? '';
    $payload = $data['payload'] ?? [];
    
    echo "Received: $type\n";

    try {
        if ($type === 'PLACE_ORDER') {
            $customer = trim($payload['customer'] ?? '');
            $items = $payload['items'] ?? [];
            $payment = $payload['payment'] ?? [];
            $paymentMethod = $payment['method'] ?? 'cash';
            $amountReceived = isset($payment['amount_received']) ? (float)$payment['amount_received'] : 0;
            $discountAmount = 0;
            $taxAmount = 0;

            $validatedItems = [];
            $subtotal = 0;
            foreach ($items as $item) {
                $name = trim((string)($item['name'] ?? ''));
                $qty = (int)($item['qty'] ?? 0);
                $price = max((float)($item['price'] ?? 0), 0);
                if ($name === '' || $qty <= 0) {
                    continue;
                }
                $validatedItems[] = [
                    'id' => isset($item['id']) ? (int)$item['id'] : null,
                    'name' => $name,
                    'qty' => $qty,
                    'price' => $price
                ];
                $subtotal += ($price * $qty);
            }

            if ($customer === '' || empty($validatedItems)) {
                sendError($clientSocket, 'Customer name and at least one valid order item are required.');
                return;
            }

            $total = $subtotal;

            if (!in_array($paymentMethod, ['cash', 'card'], true)) {
                sendError($clientSocket, 'Invalid payment method.');
                return;
            }

            if ($paymentMethod === 'cash') {
                if ($amountReceived < $total) {
                    sendError($clientSocket, 'Cash received must be greater than or equal to total.');
                    return;
                }
            } else {
                $amountReceived = $total;
            }

            $changeAmount = max(($amountReceived ?? 0) - $total, 0);

            $driver = strtolower((string)$pdo->getAttribute(PDO::ATTR_DRIVER_NAME));
            if ($driver === 'pgsql') {
                $stmt = $pdo->prepare(
                    "INSERT INTO orders (
                        customer_name, subtotal_amount, discount_amount, tax_amount, total, status,
                        payment_method, amount_received, change_amount
                    ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)
                    RETURNING id"
                );
                $stmt->execute([
                    $customer,
                    $subtotal,
                    $discountAmount,
                    $taxAmount,
                    $total,
                    $paymentMethod,
                    $amountReceived,
                    $changeAmount
                ]);
                $orderId = (int)$stmt->fetchColumn();
            } else {
                $stmt = $pdo->prepare(
                    "INSERT INTO orders (
                        customer_name, subtotal_amount, discount_amount, tax_amount, total, status,
                        payment_method, amount_received, change_amount
                    ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)"
                );
                $stmt->execute([
                    $customer,
                    $subtotal,
                    $discountAmount,
                    $taxAmount,
                    $total,
                    $paymentMethod,
                    $amountReceived,
                    $changeAmount
                ]);
                $orderId = (int)$pdo->lastInsertId();
            }
            if ($orderId <= 0) {
                throw new RuntimeException('Failed to create order.');
            }
            $receiptNumber = 'RCP-' . date('Ymd') . '-' . str_pad((string)$orderId, 6, '0', STR_PAD_LEFT);
            $stmtReceipt = $pdo->prepare("UPDATE orders SET receipt_number = ? WHERE id = ?");
            $stmtReceipt->execute([$receiptNumber, $orderId]);

            foreach($validatedItems as $item) {
                $stmtItem = $pdo->prepare("INSERT INTO order_items (order_id, product_name, quantity, price) VALUES (?, ?, ?, ?)");
                $stmtItem->execute([$orderId, $item['name'], $item['qty'], $item['price']]);

                if (isset($item['id'])) {
                    $stmtStock = $pdo->prepare(
                        "UPDATE products SET stock_quantity = GREATEST(stock_quantity - ?, 0) WHERE id = ?"
                    );
                    $stmtStock->execute([(int)$item['qty'], (int)$item['id']]);
                }
            }

            $response = mask(json_encode([
                'type' => 'NEW_ORDER',
                'payload' => [
                    'id' => $orderId,
                    'customer' => $customer,
                    'items' => $validatedItems,
                    'status' => 'pending',
                    'payment_method' => $paymentMethod,
                    'time' => date('H:i')
                ]
            ]));
            broadcast($response, $allClients);

            $ack = mask(json_encode([
                'type' => 'ORDER_PLACED',
                'payload' => [
                    'order_id' => (int)$orderId,
                    'receipt_number' => $receiptNumber,
                    'customer' => $customer,
                    'items' => $validatedItems,
                    'subtotal' => $subtotal,
                    'total' => $total,
                    'payment_method' => $paymentMethod,
                    'amount_received' => $amountReceived,
                    'change_amount' => $changeAmount,
                    'time' => date('Y-m-d H:i:s')
                ]
            ]));
            wsWrite($clientSocket, $ack);

            broadcastProductsList($pdo, $allClients);
            broadcastOrderHistory($pdo, $allClients);
            broadcastSalesSummary($pdo, $allClients);
        }
        elseif ($type === 'UPDATE_STATUS') {
            if (!requireRoles($pdo, $clientSocket, $clientSessions, ['admin', 'kitchen'], $payload)) {
                return;
            }
            $allowedStatus = ['pending', 'preparing', 'completed'];
            $status = strtolower(trim((string)($payload['status'] ?? 'pending')));
            $id = (int)($payload['id'] ?? 0);
            if ($id <= 0 || !in_array($status, $allowedStatus, true)) {
                sendError($clientSocket, 'Invalid status update payload.');
                return;
            }
            $stmt = $pdo->prepare("UPDATE orders SET status = ? WHERE id = ?");
            $stmt->execute([$status, $id]);
            if ($stmt->rowCount() === 0) {
                sendError($clientSocket, "Status update failed: order #$id not found.");
                return;
            }

            $response = mask(json_encode([
                'type' => 'STATUS_UPDATED',
                'payload' => ['id' => $id, 'status' => $status]
            ]));
            broadcast($response, $allClients);
            sendActiveOrders($pdo, $clientSocket);
            sendOrderHistory($pdo, $clientSocket);
            broadcastOrderHistory($pdo, $allClients);
            broadcastSalesSummary($pdo, $allClients);
        }
        elseif ($type === 'GET_ACTIVE_ORDERS') {
            sendActiveOrders($pdo, $clientSocket);
        }
        elseif ($type === 'GET_ORDER_HISTORY') {
            sendOrderHistory($pdo, $clientSocket);
        }
        elseif ($type === 'GET_USERS') {
            sendUsersList($pdo, $clientSocket);
        }
        elseif ($type === 'AUTH_LOGIN') {
            $username = trim((string)($payload['username'] ?? ''));
            $password = (string)($payload['password'] ?? '');
            if ($username === '' || $password === '') {
                sendError($clientSocket, 'Username and password are required.');
                return;
            }

            $stmt = $pdo->prepare("SELECT id, username, password, role FROM users WHERE username = ? LIMIT 1");
            $stmt->execute([$username]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$user) {
                $response = mask(json_encode([
                    'type' => 'LOGIN_FAILED',
                    'payload' => ['message' => 'Invalid credentials.']
                ]));
                wsWrite($clientSocket, $response);
                return;
            }

            $storedPassword = (string)($user['password'] ?? '');
            $passwordMeta = password_get_info($storedPassword);
            $isHashedPassword = !empty($passwordMeta['algo']);
            $isValid = $isHashedPassword
                ? password_verify($password, $storedPassword)
                : hash_equals($storedPassword, $password);
            if (!$isValid) {
                $response = mask(json_encode([
                    'type' => 'LOGIN_FAILED',
                    'payload' => ['message' => 'Invalid credentials.']
                ]));
                wsWrite($clientSocket, $response);
                return;
            }

            if (!$isHashedPassword) {
                $newHash = password_hash($password, PASSWORD_DEFAULT);
                $stmtUpgrade = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
                $stmtUpgrade->execute([$newHash, (int)$user['id']]);
            }

            $response = mask(json_encode([
                'type' => 'LOGIN_SUCCESS',
                'payload' => [
                    'id' => (int)$user['id'],
                    'username' => $user['username'],
                    'role' => $user['role']
                ]
            ]));
            $clientId = getSocketId($clientSocket);
            $clientSessions[$clientId] = [
                'id' => (int)$user['id'],
                'username' => (string)$user['username'],
                'role' => (string)$user['role']
            ];
            wsWrite($clientSocket, $response);
        }
        elseif ($type === 'AUTH_LOGOUT') {
            $clientId = getSocketId($clientSocket);
            unset($clientSessions[$clientId]);
            $response = mask(json_encode([
                'type' => 'LOGOUT_SUCCESS',
                'payload' => ['ok' => true]
            ]));
            wsWrite($clientSocket, $response);
        }
        elseif ($type === 'AUTH_RESUME') {
            $username = trim((string)($payload['username'] ?? ''));
            if ($username === '') {
                sendError($clientSocket, 'Username is required.');
                return;
            }

            $stmt = $pdo->prepare("SELECT id, username, role FROM users WHERE username = ? LIMIT 1");
            $stmt->execute([$username]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$user) {
                $response = mask(json_encode([
                    'type' => 'LOGIN_FAILED',
                    'payload' => ['message' => 'Invalid credentials.']
                ]));
                wsWrite($clientSocket, $response);
                return;
            }

            $clientId = getSocketId($clientSocket);
            $clientSessions[$clientId] = [
                'id' => (int)$user['id'],
                'username' => (string)$user['username'],
                'role' => (string)$user['role']
            ];
            $response = mask(json_encode([
                'type' => 'LOGIN_SUCCESS',
                'payload' => [
                    'id' => (int)$user['id'],
                    'username' => $user['username'],
                    'role' => $user['role']
                ]
            ]));
            wsWrite($clientSocket, $response);
        }
        elseif ($type === 'CREATE_USER') {
            if (!requireRoles($pdo, $clientSocket, $clientSessions, ['admin'], $payload)) {
                return;
            }
            $username = trim($payload['username'] ?? '');
            $password = trim($payload['password'] ?? '');
            $role = $payload['role'] ?? 'kitchen';

            if ($username === '' || $password === '') {
                sendError($clientSocket, 'Username and password are required.');
                return;
            }

            if (!in_array($role, ['admin', 'kitchen'], true)) {
                sendError($clientSocket, 'Invalid role selected.');
                return;
            }

            $stmtExisting = $pdo->prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1");
            $stmtExisting->execute([$username]);
            if ($stmtExisting->fetch(PDO::FETCH_ASSOC)) {
                sendError($clientSocket, 'Username already exists.');
                return;
            }

            $passwordHash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
            $stmt->execute([$username, $passwordHash, $role]);
            broadcastUsersList($pdo, $allClients);
        }
        elseif ($type === 'UPDATE_USER_ROLE') {
            if (!requireRoles($pdo, $clientSocket, $clientSessions, ['admin'], $payload)) {
                return;
            }
            $userId = (int)($payload['id'] ?? 0);
            $role = $payload['role'] ?? '';

            if ($userId <= 0 || !in_array($role, ['admin', 'kitchen'], true)) {
                sendError($clientSocket, 'Invalid user update payload.');
                return;
            }

            $stmt = $pdo->prepare("UPDATE users SET role = ? WHERE id = ?");
            $stmt->execute([$role, $userId]);
            broadcastUsersList($pdo, $allClients);
        }
        elseif ($type === 'UPDATE_USER_PASSWORD') {
            if (!requireRoles($pdo, $clientSocket, $clientSessions, ['admin'], $payload)) {
                return;
            }
            $userId = (int)($payload['id'] ?? 0);
            $newPassword = trim((string)($payload['password'] ?? ''));

            if ($userId <= 0 || $newPassword === '') {
                sendError($clientSocket, 'User id and new password are required.');
                return;
            }
            if (strlen($newPassword) < 6) {
                sendError($clientSocket, 'Password must be at least 6 characters.');
                return;
            }

            $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
            $stmt->execute([$passwordHash, $userId]);
            if ($stmt->rowCount() === 0) {
                sendError($clientSocket, "Password update failed: user #$userId not found.");
                return;
            }
            broadcastUsersList($pdo, $allClients);
        }
        elseif ($type === 'DELETE_USER') {
            if (!requireRoles($pdo, $clientSocket, $clientSessions, ['admin'], $payload)) {
                return;
            }
            $userId = (int)($payload['id'] ?? 0);
            if ($userId <= 0) {
                sendError($clientSocket, 'Invalid user id.');
                return;
            }

            $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            broadcastUsersList($pdo, $allClients);
        }
        elseif ($type === 'GET_PRODUCTS') {
            sendProductsList($pdo, $clientSocket);
        }
        elseif ($type === 'CREATE_PRODUCT') {
            if (!requireRoles($pdo, $clientSocket, $clientSessions, ['admin'], $payload)) {
                return;
            }
            $name = trim($payload['name'] ?? '');
            $price = isset($payload['price']) ? (float)$payload['price'] : 0;
            $category = trim($payload['category'] ?? '');
            $imageUrl = trim($payload['image_url'] ?? '');
            $stockQty = isset($payload['stock_quantity']) ? (int)$payload['stock_quantity'] : 0;
            $productType = inferProductType($name, $category, $payload['product_type'] ?? '');
            $capacity = trim($payload['capacity'] ?? '');
            $weightLabel = trim($payload['weight_label'] ?? '');
            $material = trim($payload['material'] ?? '');
            $description = trim($payload['description'] ?? '');

            if ($name === '' || $price < 0 || $stockQty < 0) {
                sendError($clientSocket, 'Product name, valid price, and non-negative stock are required.');
                return;
            }

            $stmt = $pdo->prepare(
                "INSERT INTO products (
                    name, price, category, image_url, stock_quantity, product_type,
                    capacity, weight_label, material, description
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );
            $stmt->execute([
                $name, $price, $category, $imageUrl, $stockQty, $productType,
                $capacity, $weightLabel, $material, $description
            ]);
            sendProductsList($pdo, $clientSocket);
            broadcastProductsList($pdo, $allClients);
        }
        elseif ($type === 'UPDATE_PRODUCT') {
            if (!requireRoles($pdo, $clientSocket, $clientSessions, ['admin'], $payload)) {
                return;
            }
            $id = (int)($payload['id'] ?? 0);
            $name = trim($payload['name'] ?? '');
            $price = isset($payload['price']) ? (float)$payload['price'] : 0;
            $category = trim($payload['category'] ?? '');
            $imageUrl = trim($payload['image_url'] ?? '');
            $stockQty = isset($payload['stock_quantity']) ? (int)$payload['stock_quantity'] : 0;
            $productType = inferProductType($name, $category, $payload['product_type'] ?? '');
            $capacity = trim($payload['capacity'] ?? '');
            $weightLabel = trim($payload['weight_label'] ?? '');
            $material = trim($payload['material'] ?? '');
            $description = trim($payload['description'] ?? '');

            if ($id <= 0 || $name === '' || $price < 0 || $stockQty < 0) {
                sendError($clientSocket, 'Invalid product update payload.');
                return;
            }

            $stmt = $pdo->prepare(
                "UPDATE products
                 SET name = ?, price = ?, category = ?, image_url = ?, stock_quantity = ?, product_type = ?,
                     capacity = ?, weight_label = ?, material = ?, description = ?
                 WHERE id = ?"
            );
            $stmt->execute([
                $name, $price, $category, $imageUrl, $stockQty, $productType,
                $capacity, $weightLabel, $material, $description, $id
            ]);
            if ($stmt->rowCount() === 0) {
                $existsStmt = $pdo->prepare("SELECT id FROM products WHERE id = ? LIMIT 1");
                $existsStmt->execute([$id]);
                if (!$existsStmt->fetch(PDO::FETCH_ASSOC)) {
                    sendError($clientSocket, "Product #$id not found.");
                    return;
                }
            }
            sendProductsList($pdo, $clientSocket);
            broadcastProductsList($pdo, $allClients);
        }
        elseif ($type === 'DELETE_PRODUCT') {
            if (!requireRoles($pdo, $clientSocket, $clientSessions, ['admin'], $payload)) {
                return;
            }
            $id = (int)($payload['id'] ?? 0);
            if ($id <= 0) {
                sendError($clientSocket, 'Invalid product id.');
                return;
            }

            $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
            $stmt->execute([$id]);
            if ($stmt->rowCount() === 0) {
                sendError($clientSocket, "Product #$id not found.");
                return;
            }
            sendProductsList($pdo, $clientSocket);
            broadcastProductsList($pdo, $allClients);
        }
        elseif ($type === 'ADJUST_STOCK') {
            if (!requireRoles($pdo, $clientSocket, $clientSessions, ['admin'], $payload)) {
                return;
            }
            $id = (int)($payload['id'] ?? 0);
            $delta = (int)($payload['delta'] ?? 0);
            if ($id <= 0 || $delta === 0) {
                sendError($clientSocket, 'Invalid stock adjustment payload.');
                return;
            }

            $stmt = $pdo->prepare(
                "UPDATE products SET stock_quantity = GREATEST(stock_quantity + ?, 0) WHERE id = ?"
            );
            $stmt->execute([$delta, $id]);
            sendProductsList($pdo, $clientSocket);
            broadcastProductsList($pdo, $allClients);
        }
        elseif ($type === 'GET_SALES_SUMMARY') {
            sendSalesSummary($pdo, $clientSocket);
        }
        elseif ($type === 'GET_REPORT') {
            if (!requireRoles($pdo, $clientSocket, $clientSessions, ['admin'], $payload)) {
                return;
            }
            $fromDate = $payload['from_date'] ?? date('Y-m-d');
            $toDate = $payload['to_date'] ?? date('Y-m-d');
            sendReportData($pdo, $clientSocket, $fromDate, $toDate);
        }
    } catch (Throwable $e) {
        echo "Error on $type: " . $e->getMessage() . "\n";
        sendError($clientSocket, $e->getMessage());
    }
}

function broadcast($msg, $clients) {
    global $socket;
    foreach($clients as $changed_socket) {
        if ($changed_socket === $socket) {
            continue;
        }
        wsWrite($changed_socket, $msg);
    }
}

function sendUsersList($pdo, $clientSocket) {
    $stmt = $pdo->query("SELECT id, username, role FROM users ORDER BY id ASC");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $response = mask(json_encode([
        'type' => 'USERS_LIST',
        'payload' => $users
    ]));
    wsWrite($clientSocket, $response);
}

function broadcastUsersList($pdo, $clients) {
    $stmt = $pdo->query("SELECT id, username, role FROM users ORDER BY id ASC");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $response = mask(json_encode([
        'type' => 'USERS_LIST',
        'payload' => $users
    ]));
    broadcast($response, $clients);
}

function sendError($clientSocket, $message) {
    $response = mask(json_encode([
        'type' => 'SERVER_ERROR',
        'payload' => ['message' => $message]
    ]));
    wsWrite($clientSocket, $response);
}

function getSocketId($socket) {
    if (is_object($socket)) {
        return 'sock_' . spl_object_id($socket);
    }
    return 'sock_' . (int)$socket;
}

function requireRoles($pdo, $clientSocket, &$clientSessions, $allowedRoles, $payload = []) {
    $clientId = getSocketId($clientSocket);
    $session = $clientSessions[$clientId] ?? null;
    if (!$session) {
        $username = trim((string)($payload['auth_username'] ?? ($payload['username'] ?? '')));
        if ($username !== '') {
            $stmt = $pdo->prepare("SELECT id, username, role FROM users WHERE username = ? LIMIT 1");
            $stmt->execute([$username]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($user) {
                $session = [
                    'id' => (int)$user['id'],
                    'username' => (string)$user['username'],
                    'role' => (string)$user['role']
                ];
                $clientSessions[$clientId] = $session;
            }
        }
        if (!$session) {
            sendError($clientSocket, 'Authentication required.');
            return false;
        }
    }

    $role = (string)($session['role'] ?? '');
    if (!in_array($role, $allowedRoles, true)) {
        sendError($clientSocket, 'Permission denied.');
        return false;
    }
    return true;
}

function sendProductsList($pdo, $clientSocket) {
    $stmt = $pdo->query(
        "SELECT id, name, price, category, image_url, stock_quantity, product_type,
                capacity, weight_label, material, description
         FROM products
         ORDER BY id DESC"
    );
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $response = mask(json_encode([
        'type' => 'PRODUCTS_LIST',
        'payload' => $products
    ]));
    wsWrite($clientSocket, $response);
}

function sendActiveOrders($pdo, $clientSocket) {
    $stmt = $pdo->query(
        "SELECT * FROM orders
         WHERE status IN ('pending', 'preparing')
         ORDER BY created_at ASC"
    );
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $orders = attachOrderItems($pdo, $orders);
    foreach($orders as &$order) {
        $order['customer'] = $order['customer_name'];
        $order['time'] = date('H:i', strtotime($order['created_at']));
    }

    $response = mask(json_encode([
        'type' => 'INIT_ORDERS',
        'payload' => $orders
    ]));
    wsWrite($clientSocket, $response);
}

function attachOrderItems($pdo, $orders) {
    if (empty($orders)) {
        return $orders;
    }
    $orderIds = array_values(array_map(static fn($order) => (int)$order['id'], $orders));
    if (empty($orderIds)) {
        return $orders;
    }
    $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
    $stmtItems = $pdo->prepare(
        "SELECT order_id, product_name as name, quantity as qty, price
         FROM order_items
         WHERE order_id IN ($placeholders)"
    );
    $stmtItems->execute($orderIds);
    $rows = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

    $grouped = [];
    foreach ($rows as $row) {
        $key = (int)$row['order_id'];
        if (!isset($grouped[$key])) {
            $grouped[$key] = [];
        }
        $grouped[$key][] = [
            'name' => $row['name'],
            'qty' => (int)$row['qty'],
            'price' => isset($row['price']) ? (float)$row['price'] : 0
        ];
    }

    foreach ($orders as &$order) {
        $key = (int)$order['id'];
        $order['items'] = $grouped[$key] ?? [];
    }
    return $orders;
}

function sendOrderHistory($pdo, $clientSocket) {
    $stmt = $pdo->query(
        "SELECT id, customer_name, subtotal_amount, total, status,
                payment_method, amount_received, change_amount, receipt_number, created_at
         FROM orders
         ORDER BY created_at DESC
         LIMIT 80"
    );
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $orders = attachOrderItems($pdo, $orders);

    $response = mask(json_encode([
        'type' => 'ORDER_HISTORY',
        'payload' => $orders
    ]));
    wsWrite($clientSocket, $response);
}

function broadcastProductsList($pdo, $clients) {
    $stmt = $pdo->query(
        "SELECT id, name, price, category, image_url, stock_quantity, product_type,
                capacity, weight_label, material, description
         FROM products
         ORDER BY id DESC"
    );
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $response = mask(json_encode([
        'type' => 'PRODUCTS_LIST',
        'payload' => $products
    ]));
    broadcast($response, $clients);
}

function broadcastOrderHistory($pdo, $clients) {
    $stmt = $pdo->query(
        "SELECT id, customer_name, subtotal_amount, total, status,
                payment_method, amount_received, change_amount, receipt_number, created_at
         FROM orders
         ORDER BY created_at DESC
         LIMIT 80"
    );
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $orders = attachOrderItems($pdo, $orders);

    $response = mask(json_encode([
        'type' => 'ORDER_HISTORY',
        'payload' => $orders
    ]));
    broadcast($response, $clients);
}

function ensureSchema($pdo) {
    $driver = strtolower((string)$pdo->getAttribute(PDO::ATTR_DRIVER_NAME));

    if ($driver === 'pgsql') {
        $pdo->exec("UPDATE users SET role = 'kitchen' WHERE role = 'cashier'");
        ensureDefaultUsers($pdo);
        seedDefaultProductsIfEmpty($pdo);
        return;
    }

    $pdo->exec("ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INT NOT NULL DEFAULT 0");
    $pdo->exec("ALTER TABLE products MODIFY COLUMN image_url LONGTEXT NULL");
    $pdo->exec("ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type VARCHAR(20) NOT NULL DEFAULT 'other'");
    $pdo->exec("ALTER TABLE products ADD COLUMN IF NOT EXISTS capacity VARCHAR(80) NULL");
    $pdo->exec("ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_label VARCHAR(80) NULL");
    $pdo->exec("ALTER TABLE products ADD COLUMN IF NOT EXISTS material VARCHAR(255) NULL");
    $pdo->exec("ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT NULL");
    $pdo->exec("UPDATE products SET product_type = LOWER(TRIM(product_type))");
    $pdo->exec("UPDATE products SET product_type = 'other' WHERE product_type NOT IN ('coffee', 'matcha', 'pastry', 'other') OR product_type = '' OR product_type IS NULL");
    $pdo->exec("UPDATE products SET product_type = 'matcha' WHERE product_type = 'other' AND (LOWER(CONCAT(COALESCE(name, ''), ' ', COALESCE(category, ''))) LIKE '%matcha%' OR LOWER(CONCAT(COALESCE(name, ''), ' ', COALESCE(category, ''))) LIKE '%green tea%' OR LOWER(CONCAT(COALESCE(name, ''), ' ', COALESCE(category, ''))) LIKE '%uji%' OR LOWER(CONCAT(COALESCE(name, ''), ' ', COALESCE(category, ''))) LIKE '%ceremonial%')");
    $pdo->exec("UPDATE products SET product_type = 'coffee' WHERE product_type = 'other' AND (LOWER(CONCAT(COALESCE(name, ''), ' ', COALESCE(category, ''))) LIKE '%coffee%' OR LOWER(CONCAT(COALESCE(name, ''), ' ', COALESCE(category, ''))) LIKE '%espresso%' OR LOWER(CONCAT(COALESCE(name, ''), ' ', COALESCE(category, ''))) LIKE '%latte%' OR LOWER(CONCAT(COALESCE(name, ''), ' ', COALESCE(category, ''))) LIKE '%cappuccino%' OR LOWER(CONCAT(COALESCE(name, ''), ' ', COALESCE(category, ''))) LIKE '%americano%' OR LOWER(CONCAT(COALESCE(name, ''), ' ', COALESCE(category, ''))) LIKE '%mocha%' OR LOWER(CONCAT(COALESCE(name, ''), ' ', COALESCE(category, ''))) LIKE '%brew%' OR LOWER(CONCAT(COALESCE(name, ''), ' ', COALESCE(category, ''))) LIKE '%macchiato%' OR LOWER(CONCAT(COALESCE(name, ''), ' ', COALESCE(category, ''))) LIKE '%affogato%')");
    $pdo->exec("ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) NOT NULL DEFAULT 'cash'");
    $pdo->exec("ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount_received DECIMAL(10,2) DEFAULT NULL");
    $pdo->exec("ALTER TABLE orders ADD COLUMN IF NOT EXISTS change_amount DECIMAL(10,2) NOT NULL DEFAULT 0");
    $pdo->exec("ALTER TABLE orders ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(40) DEFAULT NULL");
    $pdo->exec("ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_amount DECIMAL(10,2) NOT NULL DEFAULT 0");
    $pdo->exec("ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0");
    $pdo->exec("ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0");
    $pdo->exec("UPDATE orders SET subtotal_amount = total WHERE subtotal_amount = 0 AND total > 0");
    $pdo->exec("UPDATE users SET role = 'kitchen' WHERE role = 'cashier'");
    $pdo->exec("UPDATE orders SET status = 'cancelled' WHERE status IN ('voided', 'refunded')");
    $pdo->exec("ALTER TABLE orders MODIFY COLUMN status ENUM('pending', 'preparing', 'completed', 'cancelled') NOT NULL DEFAULT 'pending'");
    ensureDefaultUsers($pdo);
    seedDefaultProductsIfEmpty($pdo);
}

function ensureDefaultUsers($pdo) {
    $defaults = [
        ['admin', 'admin123', 'admin'],
        ['kitchen', 'kitchen123', 'kitchen']
    ];

    foreach ($defaults as $row) {
        [$username, $password, $role] = $row;
        $stmt = $pdo->prepare("SELECT id, password FROM users WHERE username = ? ORDER BY id ASC LIMIT 1");
        $stmt->execute([$username]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            $storedPassword = (string)($existing['password'] ?? '');
            $passwordMeta = password_get_info($storedPassword);
            $isHashedPassword = !empty($passwordMeta['algo']);

            if (!$isHashedPassword && hash_equals($storedPassword, $password)) {
                $hash = password_hash($password, PASSWORD_DEFAULT);
                $update = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
                $update->execute([$hash, (int)$existing['id']]);
            }
        } else {
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $insert = $pdo->prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
            $insert->execute([$username, $hash, $role]);
        }
    }
}

function seedDefaultProductsIfEmpty($pdo) {
    $countStmt = $pdo->query("SELECT COUNT(*) AS total FROM products");
    $count = (int)($countStmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);
    if ($count > 0) return;

    $seedProducts = [
        ['House Cappuccino.', 190, 'Coffee', 'coffee', '240ml cup', 'Single serving', 'Espresso + steamed milk + foam', 'A creamy cappuccino with balanced espresso, silky milk, and a smooth foam cap in every cup.'],
        ['Signature Espresso.', 220, 'Coffee', 'coffee', '60ml double shot', 'Single serving', '100% arabica espresso', 'A bold, concentrated espresso shot with rich body, caramel sweetness, and a clean finish.'],
        ['Cafe Latte.', 250, 'Coffee', 'coffee', '300ml cup', 'Single serving', 'Espresso + steamed milk', 'A mellow latte combining espresso and steamed milk for a creamy, comforting cup.'],
        ['Daily Brew Blend.', 280, 'Coffee', 'coffee', '300ml cup', 'Single serving', 'Fresh brewed house blend', 'Our daily brewed black coffee with a smooth profile, cocoa notes, and bright aroma.'],
        ['Nitro Cold Brew.', 320, 'Coffee', 'coffee', '300ml cup', 'Single serving', 'Cold-steeped coffee extract', 'Slow-steeped cold brew served chilled with a naturally sweet, velvety cup profile.'],
        ["Roaster's Spotlight.", 380, 'Coffee', 'coffee', '300ml cup', 'Single serving', 'Seasonal single-origin coffee', 'A rotating single-origin cup featuring seasonal notes and distinct character in each brew.'],
        ['Ceremonial Matcha.', 210, 'Matcha', 'matcha', '240ml cup', 'Single serving', 'Ceremonial matcha + water', 'Stone-ground ceremonial matcha whisked for a smooth, vibrant cup with earthy sweetness.'],
        ['Matcha Latte.', 230, 'Matcha', 'matcha', '300ml cup', 'Single serving', 'Matcha + steamed milk', 'A creamy matcha latte with balanced umami notes and silky steamed milk texture.'],
        ['Iced Strawberry Matcha.', 245, 'Matcha', 'matcha', '360ml cup', 'Single serving', 'Matcha + strawberry puree + milk', 'Layered matcha and strawberry blend over ice for a refreshing sweet-earthy finish.'],
        ['Matcha.', 200, 'Matcha', 'matcha', '240ml cup', 'Single serving', 'Matcha + water', 'A smooth everyday matcha drink with mellow umami and a clean finish.'],
        ['Double Double French Vanilla', 210, 'Coffee', 'coffee', '300ml cup', 'Single serving', 'Coffee + french vanilla blend + cream', 'Smooth French vanilla coffee with a richer double cream and double sweetness profile.'],
        ['Spanish Latte', 240, 'Coffee', 'coffee', '300ml cup', 'Single serving', 'Espresso + milk + condensed milk', 'Espresso with sweetened milk for a smooth and creamy latte with caramel notes.'],
        ['Caramel Macchiato', 250, 'Coffee', 'coffee', '300ml cup', 'Single serving', 'Espresso + steamed milk + caramel syrup', 'Layered espresso and milk finished with caramel drizzle for a sweet balanced cup.'],
        ['Cold Brew Redbull Coffee', 280, 'Coffee', 'coffee', '360ml cup', 'Single serving', 'Cold brew + Red Bull + ice', 'Bold cold brew lifted with Red Bull for a strong, sparkling energy kick.'],
        ['Croissant', 120, 'Pastry', 'pastry', '1 piece', 'Single serving', 'Butter laminated pastry dough', 'Buttery, flaky croissant baked fresh daily for a light and crisp bite.'],
        ['Smores', 160, 'Pastry', 'pastry', '1 piece', 'Single serving', 'Marshmallow + chocolate + biscuit crumb', 'Toasted marshmallow and chocolate-filled pastry inspired by classic campfire s’mores.'],
        ['Classic Cookie', 95, 'Pastry', 'pastry', '2 pieces', 'Single serving', 'Butter cookie dough + chocolate chips', 'Soft-baked cookies with a golden edge and rich chocolate chips in every bite.'],
        ['Classic Bagel', 130, 'Pastry', 'pastry', '1 piece', 'Single serving', 'Yeast dough bagel', 'Chewy and golden-baked classic bagel, ideal for breakfast or coffee pairing.'],
        ['Boston Cream', 95, 'Pastry', 'pastry', '1 piece', 'Single serving', 'Fried dough + custard + chocolate glaze', 'Soft donut filled with vanilla custard and topped with rich chocolate glaze.'],
        ['Mapel Dip', 90, 'Pastry', 'pastry', '1 piece', 'Single serving', 'Fried dough + maple glaze', 'Classic donut finished with a sweet maple dip for a warm caramelized taste.'],
        ['Chocolate Dip', 90, 'Pastry', 'pastry', '1 piece', 'Single serving', 'Fried dough + chocolate glaze', 'Fluffy donut topped with silky chocolate dip for a simple sweet favorite.'],
        ['Bavarian Filled Timbit', 75, 'Pastry', 'pastry', '4 bites', 'Single serving', 'Dough bites + Bavarian cream', 'Bite-sized timbit filled with creamy Bavarian filling and dusted for a sweet finish.'],
        ['Strawberry Filled Timbit', 75, 'Pastry', 'pastry', '4 bites', 'Single serving', 'Dough bites + strawberry filling', 'Soft timbit bites filled with strawberry center for a fruity pastry snack.'],
        ['Siopao Asado', 85, 'Pastry', 'pastry', '1 piece', 'Single serving', 'Steamed bun + asado pork filling', 'Steamed soft bun filled with savory-sweet asado pork for a warm snack.'],
        ['Matcha Cookie', 110, 'Pastry', 'pastry', '2 pieces', 'Single serving', 'Cookie dough + matcha powder', 'Buttery cookie infused with matcha for a mellow earthy sweetness.'],
        ['Almond Cookie', 115, 'Pastry', 'pastry', '2 pieces', 'Single serving', 'Cookie dough + roasted almonds', 'Crunchy golden cookie with roasted almond notes and a clean buttery finish.'],
        ['Strawberry Pop Tarts', 125, 'Pastry', 'pastry', '1 piece', 'Single serving', 'Pastry crust + strawberry filling + glaze', 'Toasted pastry with strawberry filling and a sweet glazed top.']
    ];

    $stmt = $pdo->prepare(
        "INSERT INTO products (
            name, price, category, image_url, stock_quantity, product_type, capacity, weight_label, material, description
        ) VALUES (?, ?, ?, '', 25, ?, ?, ?, ?, ?)"
    );

    foreach ($seedProducts as $item) {
        [$name, $price, $category, $productType, $capacity, $weightLabel, $material, $description] = $item;
        $stmt->execute([$name, $price, $category, $productType, $capacity, $weightLabel, $material, $description]);
    }
}

function getSalesSummaryData($pdo) {
    $summary = [
        'today_orders' => 0,
        'today_revenue' => 0,
        'today_sales' => 0,
        'completed_today_revenue' => 0,
        'pending_count' => 0,
        'preparing_count' => 0,
        'completed_count' => 0,
        'cancelled_count' => 0,
        'recent_orders' => []
    ];

    $stmtTodayOrders = $pdo->query("SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURRENT_DATE");
    $summary['today_orders'] = (int)$stmtTodayOrders->fetch(PDO::FETCH_ASSOC)['count'];

    $stmtTodayRevenue = $pdo->query(
        "SELECT COALESCE(SUM(total), 0) as total
         FROM orders
         WHERE DATE(created_at) = CURRENT_DATE AND status IN ('pending', 'preparing', 'completed')"
    );
    $summary['today_revenue'] = (float)$stmtTodayRevenue->fetch(PDO::FETCH_ASSOC)['total'];

    $summary['today_sales'] = $summary['today_revenue'];

    $stmtCompletedTodayRevenue = $pdo->query(
        "SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed'"
    );
    $summary['completed_today_revenue'] = (float)$stmtCompletedTodayRevenue->fetch(PDO::FETCH_ASSOC)['total'];

    $stmtStatusCounts = $pdo->query("SELECT status, COUNT(*) as count FROM orders GROUP BY status");
    $statusCounts = $stmtStatusCounts->fetchAll(PDO::FETCH_ASSOC);
    foreach ($statusCounts as $row) {
        $status = $row['status'];
        $count = (int)$row['count'];
        if ($status === 'pending') $summary['pending_count'] = $count;
        if ($status === 'preparing') $summary['preparing_count'] = $count;
        if ($status === 'completed') $summary['completed_count'] = $count;
        if ($status === 'cancelled') $summary['cancelled_count'] = $count;
    }

    $stmtRecent = $pdo->query(
        "SELECT id, customer_name, subtotal_amount, total, status, created_at
         FROM orders ORDER BY created_at DESC LIMIT 8"
    );
    $summary['recent_orders'] = $stmtRecent->fetchAll(PDO::FETCH_ASSOC);

    return $summary;
}

function sendSalesSummary($pdo, $clientSocket) {
    $response = mask(json_encode([
        'type' => 'SALES_SUMMARY',
        'payload' => getSalesSummaryData($pdo)
    ]));
    wsWrite($clientSocket, $response);
}

function broadcastSalesSummary($pdo, $clients) {
    $response = mask(json_encode([
        'type' => 'SALES_SUMMARY',
        'payload' => getSalesSummaryData($pdo)
    ]));
    broadcast($response, $clients);
}

function getReportData($pdo, $fromDate, $toDate) {
    $fromDateTime = $fromDate . ' 00:00:00';
    $toDateTime = $toDate . ' 23:59:59';

    $summary = [
        'total_orders' => 0,
        'total_sales' => 0,
        'completed_revenue' => 0,
        'pending_count' => 0,
        'preparing_count' => 0,
        'completed_count' => 0,
        'cancelled_count' => 0
    ];

    $stmt = $pdo->prepare(
        "SELECT
            COUNT(*) as total_orders,
            COALESCE(SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END), 0) as total_sales,
            COALESCE(SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END), 0) as completed_revenue,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
            SUM(CASE WHEN status = 'preparing' THEN 1 ELSE 0 END) as preparing_count,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count
         FROM orders
         WHERE created_at BETWEEN ? AND ?"
    );
    $stmt->execute([$fromDateTime, $toDateTime]);
    $summaryRow = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($summaryRow) {
        $summary = [
            'total_orders' => (int)$summaryRow['total_orders'],
            'total_sales' => (float)$summaryRow['total_sales'],
            'completed_revenue' => (float)$summaryRow['completed_revenue'],
            'pending_count' => (int)$summaryRow['pending_count'],
            'preparing_count' => (int)$summaryRow['preparing_count'],
            'completed_count' => (int)$summaryRow['completed_count'],
            'cancelled_count' => (int)$summaryRow['cancelled_count']
        ];
    }

    $stmtOrders = $pdo->prepare(
        "SELECT id, customer_name, subtotal_amount, total, status, created_at
         FROM orders
         WHERE created_at BETWEEN ? AND ?
         ORDER BY created_at DESC"
    );
    $stmtOrders->execute([$fromDateTime, $toDateTime]);
    $orders = $stmtOrders->fetchAll(PDO::FETCH_ASSOC);

    $stmtTop = $pdo->prepare(
        "SELECT oi.product_name, SUM(oi.quantity) as qty_sold, COALESCE(SUM(oi.quantity * oi.price), 0) as sales_amount
         FROM order_items oi
         INNER JOIN orders o ON o.id = oi.order_id
         WHERE o.created_at BETWEEN ? AND ?
         GROUP BY oi.product_name
         ORDER BY qty_sold DESC, sales_amount DESC
         LIMIT 10"
    );
    $stmtTop->execute([$fromDateTime, $toDateTime]);
    $topProducts = $stmtTop->fetchAll(PDO::FETCH_ASSOC);

    $stmtInventory = $pdo->query(
        "SELECT id, name, category, product_type, stock_quantity, price FROM products ORDER BY stock_quantity ASC, id ASC"
    );
    $inventory = $stmtInventory->fetchAll(PDO::FETCH_ASSOC);

    return [
        'from_date' => $fromDate,
        'to_date' => $toDate,
        'summary' => $summary,
        'orders' => $orders,
        'top_products' => $topProducts,
        'inventory' => $inventory
    ];
}

function sendReportData($pdo, $clientSocket, $fromDate, $toDate) {
    $response = mask(json_encode([
        'type' => 'REPORT_DATA',
        'payload' => getReportData($pdo, $fromDate, $toDate)
    ]));
    wsWrite($clientSocket, $response);
}

function perform_handshake($receved_header, $client_conn, $host, $port) {
    global $clientSessions, $clients;
    $headers = array();
    if (!is_string($receved_header) || trim($receved_header) === '') {
        return false;
    }
    $lines = preg_split("/\r\n/", $receved_header);
    foreach($lines as $line) {
        $line = chop($line);
        if(preg_match('/\A(\S+): (.*)\z/', $line, $matches)) {
            $headers[$matches[1]] = $matches[2];
        }
    }
    if (!isset($headers['Sec-WebSocket-Key'])) {
        handleHttpRequest($receved_header, $client_conn, $clientSessions, $clients);
        return false;
    }
    $secKey = $headers['Sec-WebSocket-Key'];
    $secAccept = base64_encode(pack('H*', sha1($secKey . '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')));
    $buffer  = "HTTP/1.1 101 Switching Protocols\r\n" .
               "Upgrade: websocket\r\n" .
               "Connection: Upgrade\r\n" .
               "Sec-WebSocket-Accept: $secAccept\r\n\r\n";
    socket_write($client_conn, $buffer, strlen($buffer));
    return true;
}

function handleHttpRequest($rawHeader, $clientConn, &$clientSessions, &$clients) {
    $line = strtok($rawHeader, "\r\n");
    if (!is_string($line) || trim($line) === '') {
        httpText($clientConn, 400, 'Bad Request');
        return;
    }

    if (!preg_match('#^(GET|POST|OPTIONS)\s+(\S+)\s+HTTP/#', $line, $m)) {
        httpText($clientConn, 400, 'Bad Request');
        return;
    }
    $method = strtoupper($m[1]);
    $target = $m[2];
    $parts = parse_url($target);
    $path = $parts['path'] ?? '/';
    parse_str($parts['query'] ?? '', $query);

    if ($method === 'OPTIONS') {
        $headers = [
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET,POST,OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type'
        ];
        httpText($clientConn, 204, '', $headers);
        return;
    }

    if ($path === '/api/update-status') {
        try {
            $pdo = getDB();
            $id = (int)($query['id'] ?? 0);
            $status = strtolower(trim((string)($query['status'] ?? '')));
            $authUsername = trim((string)($query['auth_username'] ?? ''));
            $allowedStatus = ['pending', 'preparing', 'completed'];
            if ($id <= 0 || !in_array($status, $allowedStatus, true)) {
                httpJson($clientConn, 422, ['ok' => false, 'message' => 'Invalid status payload.']);
                return;
            }
            if ($authUsername === '') {
                httpJson($clientConn, 401, ['ok' => false, 'message' => 'Authentication required.']);
                return;
            }

            $stmtUser = $pdo->prepare("SELECT role FROM users WHERE username = ? LIMIT 1");
            $stmtUser->execute([$authUsername]);
            $user = $stmtUser->fetch(PDO::FETCH_ASSOC);
            $role = strtolower(trim((string)($user['role'] ?? '')));
            if (!in_array($role, ['admin', 'kitchen'], true)) {
                httpJson($clientConn, 403, ['ok' => false, 'message' => 'Permission denied.']);
                return;
            }

            $stmt = $pdo->prepare("UPDATE orders SET status = ? WHERE id = ?");
            $stmt->execute([$status, $id]);
            if ($stmt->rowCount() === 0) {
                httpJson($clientConn, 404, ['ok' => false, 'message' => "Order #$id not found."]);
                return;
            }

            $response = mask(json_encode([
                'type' => 'STATUS_UPDATED',
                'payload' => ['id' => $id, 'status' => $status]
            ]));
            broadcast($response, $clients);
            broadcastOrderHistory($pdo, $clients);
            broadcastSalesSummary($pdo, $clients);

            httpJson($clientConn, 200, ['ok' => true, 'id' => $id, 'status' => $status]);
            return;
        } catch (Throwable $e) {
            httpJson($clientConn, 500, ['ok' => false, 'message' => $e->getMessage()]);
            return;
        }
    }

    if ($path === '/health' || $path === '/') {
        httpText($clientConn, 200, "WebSocket server is running.\n", ['Access-Control-Allow-Origin' => '*']);
        return;
    }

    httpText($clientConn, 404, 'Not Found', ['Access-Control-Allow-Origin' => '*']);
}

function httpJson($clientConn, $status, $payload, $extraHeaders = []) {
    $body = json_encode($payload, JSON_UNESCAPED_SLASHES);
    $headers = array_merge([
        'Content-Type' => 'application/json; charset=utf-8',
        'Content-Length' => (string)strlen($body),
        'Connection' => 'close',
        'Access-Control-Allow-Origin' => '*'
    ], $extraHeaders);
    $statusLine = "HTTP/1.1 $status " . httpStatusText($status) . "\r\n";
    $headerText = '';
    foreach ($headers as $k => $v) {
        $headerText .= $k . ': ' . $v . "\r\n";
    }
    @socket_write($clientConn, $statusLine . $headerText . "\r\n" . $body);
}

function httpText($clientConn, $status, $body, $extraHeaders = []) {
    $headers = array_merge([
        'Content-Type' => 'text/plain; charset=utf-8',
        'Content-Length' => (string)strlen($body),
        'Connection' => 'close',
        'Access-Control-Allow-Origin' => '*'
    ], $extraHeaders);
    $statusLine = "HTTP/1.1 $status " . httpStatusText($status) . "\r\n";
    $headerText = '';
    foreach ($headers as $k => $v) {
        $headerText .= $k . ': ' . $v . "\r\n";
    }
    @socket_write($clientConn, $statusLine . $headerText . "\r\n" . $body);
}

function httpStatusText($status) {
    return match ((int)$status) {
        200 => 'OK',
        201 => 'Created',
        204 => 'No Content',
        400 => 'Bad Request',
        401 => 'Unauthorized',
        403 => 'Forbidden',
        404 => 'Not Found',
        422 => 'Unprocessable Entity',
        500 => 'Internal Server Error',
        default => 'OK'
    };
}

function unmask($text) {
    $length = ord($text[1]) & 127;
    if($length == 126) {
        $masks = substr($text, 4, 4);
        $data = substr($text, 8);
    } elseif($length == 127) {
        $masks = substr($text, 10, 4);
        $data = substr($text, 14);
    } else {
        $masks = substr($text, 2, 4);
        $data = substr($text, 6);
    }
    $text = "";
    for ($i = 0; $i < strlen($data); ++$i) {
        $text .= $data[$i] ^ $masks[$i%4];
    }
    return $text;
}

function decodeWebSocketFrames($buffer) {
    $messages = [];
    $len = strlen($buffer);
    $offset = 0;

    while ($offset + 2 <= $len) {
        $byte1 = ord($buffer[$offset]);
        $byte2 = ord($buffer[$offset + 1]);
        $isMasked = ($byte2 & 0x80) !== 0;
        $payloadLen = $byte2 & 0x7F;
        $headerLen = 2;

        if ($payloadLen === 126) {
            if ($offset + 4 > $len) break;
            $payloadLen = unpack('n', substr($buffer, $offset + 2, 2))[1];
            $headerLen += 2;
        } elseif ($payloadLen === 127) {
            if ($offset + 10 > $len) break;
            $ext = substr($buffer, $offset + 2, 8);
            $parts = unpack('N2', $ext);
            $payloadLen = ($parts[1] << 32) + $parts[2];
            $headerLen += 8;
        }

        $mask = '';
        if ($isMasked) {
            if ($offset + $headerLen + 4 > $len) break;
            $mask = substr($buffer, $offset + $headerLen, 4);
            $headerLen += 4;
        }

        if ($offset + $headerLen + $payloadLen > $len) {
            break;
        }

        $payload = substr($buffer, $offset + $headerLen, $payloadLen);

        if ($isMasked) {
            $decoded = '';
            for ($i = 0; $i < $payloadLen; $i++) {
                $decoded .= $payload[$i] ^ $mask[$i % 4];
            }
            $messages[] = $decoded;
        } else {
            $messages[] = $payload;
        }

        $offset += $headerLen + $payloadLen;
        if (($byte1 & 0x0F) === 0x8) {
            break;
        }
    }

    if (empty($messages)) {
        $fallback = @unmask($buffer);
        if (is_string($fallback) && $fallback !== '') {
            $messages[] = $fallback;
        }
    }

    return $messages;
}

function mask($text) {
    $b1 = 0x80 | (0x1 & 0x0f);
    $length = strlen($text);
    if($length <= 125) $header = pack('CC', $b1, $length);
    elseif($length > 125 && $length < 65536) $header = pack('CCn', $b1, 126, $length);
    elseif($length >= 65536) {
        $header = pack('CCNN', $b1, 127, 0, $length);
    }
    return $header.$text;
}
?>
