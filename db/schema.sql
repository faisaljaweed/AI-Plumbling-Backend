-- Minimal PostgreSQL schema for a fresh demo. Existing tables are preserved.
CREATE TABLE IF NOT EXISTS businesses (
 id serial PRIMARY KEY, name varchar(150) NOT NULL, email varchar(254), phone varchar(30), address text, city varchar(100), state varchar(50)
);
CREATE TABLE IF NOT EXISTS leads (
 id serial PRIMARY KEY, business_id integer NOT NULL REFERENCES businesses(id), customer_name varchar(100) NOT NULL,
 email varchar(254), phone varchar(30), zip_code varchar(10), service_type varchar(150), issue_description text, urgency varchar(20) DEFAULT 'normal',
 status varchar(30) DEFAULT 'new', preferred_date date, preferred_time varchar(30),
 created_at timestamp DEFAULT timezone('UTC',now()), updated_at timestamp DEFAULT timezone('UTC',now())
);
CREATE TABLE IF NOT EXISTS chat_messages (
 id serial PRIMARY KEY, lead_id integer NOT NULL REFERENCES leads(id), role varchar(20) NOT NULL, content text NOT NULL,
 created_at timestamp DEFAULT timezone('UTC',now())
);
CREATE TABLE IF NOT EXISTS availability_slots (
 id serial PRIMARY KEY, business_id integer NOT NULL REFERENCES businesses(id), slot_date date NOT NULL, slot_time varchar(30) NOT NULL,
 is_available boolean NOT NULL DEFAULT true, created_at timestamp DEFAULT timezone('UTC',now()), UNIQUE(business_id,slot_date,slot_time)
);
CREATE TABLE IF NOT EXISTS bookings (
 id serial PRIMARY KEY, business_id integer NOT NULL REFERENCES businesses(id), lead_id integer NOT NULL REFERENCES leads(id),
 availability_slot_id integer NOT NULL REFERENCES availability_slots(id), booking_date date NOT NULL, booking_time varchar(30) NOT NULL,
 status varchar(30) DEFAULT 'confirmed', notes text, created_at timestamp DEFAULT timezone('UTC',now()), updated_at timestamp DEFAULT timezone('UTC',now())
);
CREATE TABLE IF NOT EXISTS followups (
 id serial PRIMARY KEY, business_id integer NOT NULL REFERENCES businesses(id), lead_id integer NOT NULL REFERENCES leads(id), message text NOT NULL,
 channel varchar(20) DEFAULT 'email', status varchar(30) DEFAULT 'scheduled', scheduled_at timestamp, sent_at timestamp,
 created_at timestamp DEFAULT timezone('UTC',now())
);
INSERT INTO businesses(id,name,email,phone,address,city,state)
 VALUES(1,'RapidFlow Plumbing','demo@example.com','+1 214 555 0101','Demo business','Dallas','Texas') ON CONFLICT(id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('businesses','id'),GREATEST(1,(SELECT MAX(id) FROM businesses)));
