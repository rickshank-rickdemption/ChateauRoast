begin;

create table if not exists public.users (
  id bigserial primary key,
  username varchar(50) not null unique,
  password varchar(255) not null,
  role varchar(20) not null check (role in ('admin', 'cashier', 'kitchen'))
);

create table if not exists public.products (
  id bigserial primary key,
  name varchar(100) not null,
  price numeric(10, 2) not null check (price >= 0),
  category varchar(50),
  product_type varchar(20) not null default 'other' check (product_type in ('coffee', 'matcha', 'pastry', 'other')),
  capacity varchar(80),
  weight_label varchar(80),
  material varchar(255),
  description text,
  image_url text,
  stock_quantity integer not null default 0 check (stock_quantity >= 0)
);

create table if not exists public.orders (
  id bigserial primary key,
  customer_name varchar(100),
  subtotal_amount numeric(10, 2) not null default 0 check (subtotal_amount >= 0),
  discount_amount numeric(10, 2) not null default 0 check (discount_amount >= 0),
  tax_amount numeric(10, 2) not null default 0 check (tax_amount >= 0),
  total numeric(10, 2) not null check (total >= 0),
  status varchar(20) not null default 'pending' check (status in ('pending', 'preparing', 'completed', 'cancelled', 'voided', 'refunded')),
  payment_method varchar(20) not null default 'cash' check (payment_method in ('cash', 'card')),
  amount_received numeric(10, 2),
  change_amount numeric(10, 2) not null default 0 check (change_amount >= 0),
  receipt_number varchar(40),
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_orders_status on public.orders (status);
create unique index if not exists uq_orders_receipt_number on public.orders (receipt_number) where receipt_number is not null;

create table if not exists public.order_items (
  id bigserial primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  product_name varchar(100) not null,
  quantity integer not null check (quantity > 0),
  price numeric(10, 2) not null check (price >= 0)
);

create index if not exists idx_order_items_order_id on public.order_items(order_id);

commit;
