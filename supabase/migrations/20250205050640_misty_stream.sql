/*
  # Initial Schema for Invoice and Inventory Management System

  1. New Tables
    - `products`
      - Basic product information and stock tracking
    - `customers`
      - Customer details for invoicing
    - `invoices`
      - Invoice header information
    - `invoice_items`
      - Individual line items for invoices
    - `stock_movements`
      - Track all stock changes (in/out)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  sku text UNIQUE,
  price decimal(10,2) NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  min_stock_level integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  phone text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  subtotal decimal(10,2) NOT NULL DEFAULT 0,
  tax decimal(10,2) NOT NULL DEFAULT 0,
  total decimal(10,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id),
  product_id uuid REFERENCES products(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  total decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Stock movements table
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  quantity integer NOT NULL,
  movement_type text NOT NULL,
  reference_id uuid,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Full access for authenticated users" ON products
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Full access for authenticated users" ON customers
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Full access for authenticated users" ON invoices
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Full access for authenticated users" ON invoice_items
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Full access for authenticated users" ON stock_movements
  FOR ALL TO authenticated USING (true);

-- Functions
CREATE OR REPLACE FUNCTION update_stock_on_invoice() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status = 'draft' THEN
    INSERT INTO stock_movements (product_id, quantity, movement_type, reference_id, notes)
    SELECT 
      product_id,
      -quantity,
      'invoice',
      NEW.id,
      'Stock reduction from invoice ' || NEW.invoice_number
    FROM invoice_items
    WHERE invoice_id = NEW.id;

    UPDATE products p
    SET stock_quantity = p.stock_quantity - i.quantity
    FROM invoice_items i
    WHERE i.invoice_id = NEW.id AND p.id = i.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;