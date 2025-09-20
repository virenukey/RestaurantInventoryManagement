#!/usr/bin/env python3
"""
SQLite to PostgreSQL Migration Script
Migrates all data from inventory.db to PostgreSQL database
"""

import sqlite3
import psycopg2
import os
from datetime import datetime
import sys

# Configuration
SQLITE_DB_PATH = "inventory.db"
# Get PostgreSQL connection from environment or set directly
POSTGRES_URL = os.getenv("DATABASE_URL", "postgresql://username:password@host:port/database")


def connect_sqlite():
    """Connect to SQLite database"""
    try:
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row  # Access columns by name
        print(f"✅ Connected to SQLite: {SQLITE_DB_PATH}")
        return conn
    except sqlite3.Error as e:
        print(f"❌ SQLite connection error: {e}")
        sys.exit(1)


def connect_postgres():
    """Connect to PostgreSQL database"""
    try:
        # Handle postgres:// URL (common on Heroku/Render)
        postgres_url = POSTGRES_URL
        if postgres_url.startswith("postgres://"):
            postgres_url = postgres_url.replace("postgres://", "postgresql://", 1)

        conn = psycopg2.connect(postgres_url)
        print(f"✅ Connected to PostgreSQL")
        return conn
    except psycopg2.Error as e:
        print(f"❌ PostgreSQL connection error: {e}")
        sys.exit(1)


def get_table_structure(sqlite_conn):
    """Get all tables and their structure from SQLite"""
    cursor = sqlite_conn.cursor()

    # Get all table names
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    tables = [row[0] for row in cursor.fetchall()]

    table_info = {}
    for table in tables:
        cursor.execute(f"PRAGMA table_info({table})")
        columns = cursor.fetchall()
        table_info[table] = columns
        print(f"📋 Found table: {table} with {len(columns)} columns")

    return table_info


def migrate_table_data(sqlite_conn, postgres_conn, table_name, columns):
    """Migrate data from one table"""
    sqlite_cursor = sqlite_conn.cursor()
    postgres_cursor = postgres_conn.cursor()

    print(f"📤 Migrating table: {table_name}")

    # Get all data from SQLite
    sqlite_cursor.execute(f"SELECT * FROM {table_name}")
    rows = sqlite_cursor.fetchall()

    if not rows:
        print(f"⚠️  Table {table_name} is empty")
        return 0

    # Prepare column names and placeholders
    column_names = [col[1] for col in columns]  # col[1] is the column name
    placeholders = ', '.join(['%s'] * len(column_names))
    columns_str = ', '.join(column_names)

    # Insert query
    insert_query = f"""
        INSERT INTO {table_name} ({columns_str}) 
        VALUES ({placeholders})
        ON CONFLICT DO NOTHING
    """

    # Convert rows to tuples for insertion
    migrated_count = 0
    failed_count = 0

    for row in rows:
        try:
            # Convert row to tuple, handling None values and dates
            row_data = []
            for i, value in enumerate(row):
                if value is None:
                    row_data.append(None)
                elif isinstance(value, str) and 'date' in column_names[i].lower():
                    # Try to parse date strings
                    try:
                        # Handle various date formats
                        if 'T' in value:
                            parsed_date = datetime.fromisoformat(value.replace('Z', '+00:00'))
                        else:
                            parsed_date = datetime.strptime(value, '%Y-%m-%d %H:%M:%S')
                        row_data.append(parsed_date)
                    except:
                        row_data.append(value)
                else:
                    row_data.append(value)

            postgres_cursor.execute(insert_query, row_data)
            migrated_count += 1

        except psycopg2.Error as e:
            print(f"⚠️  Failed to insert row in {table_name}: {e}")
            failed_count += 1
            continue

    postgres_conn.commit()
    print(f"✅ Migrated {migrated_count} rows to {table_name} (failed: {failed_count})")
    return migrated_count


def verify_migration(sqlite_conn, postgres_conn, table_name):
    """Verify that migration was successful"""
    sqlite_cursor = sqlite_conn.cursor()
    postgres_cursor = postgres_conn.cursor()

    # Count rows in both databases
    sqlite_cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
    sqlite_count = sqlite_cursor.fetchone()[0]

    postgres_cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
    postgres_count = postgres_cursor.fetchone()[0]

    if sqlite_count == postgres_count:
        print(f"✅ Verification passed for {table_name}: {postgres_count} rows")
        return True
    else:
        print(f"⚠️  Verification failed for {table_name}: SQLite={sqlite_count}, PostgreSQL={postgres_count}")
        return False


def create_postgres_tables_if_needed(postgres_conn):
    """Create tables in PostgreSQL if they don't exist"""
    postgres_cursor = postgres_conn.cursor()

    # Create tables based on your SQLAlchemy models
    create_tables_sql = """
    -- Create dish_types table
    CREATE TABLE IF NOT EXISTS dish_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR UNIQUE NOT NULL
    );

    -- Create dishes table
    CREATE TABLE IF NOT EXISTS dishes (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        type_id INTEGER REFERENCES dish_types(id)
    );

    -- Create dish_ingredients table
    CREATE TABLE IF NOT EXISTS dish_ingredients (
        id SERIAL PRIMARY KEY,
        ingredient_name VARCHAR NOT NULL,
        dish_id INTEGER REFERENCES dishes(id),
        quantity_required REAL NOT NULL,
        unit VARCHAR DEFAULT 'gm',
        cost_per_unit REAL DEFAULT 0.0
    );

    -- Create inventory table
    CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        quantity REAL NOT NULL,
        unit VARCHAR NOT NULL,
        price_per_unit REAL NOT NULL,
        total_cost REAL NOT NULL,
        type VARCHAR,
        date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create expenses table
    CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        item_name VARCHAR NOT NULL,
        quantity REAL NOT NULL,
        total_cost REAL NOT NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create inventory_log table
    CREATE TABLE IF NOT EXISTS inventory_log (
        id SERIAL PRIMARY KEY,
        ingredient_id INTEGER REFERENCES inventory(id),
        quantity_left REAL NOT NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """

    postgres_cursor.execute(create_tables_sql)
    postgres_conn.commit()
    print("✅ PostgreSQL tables created/verified")


def main():
    """Main migration function"""
    print("🚀 Starting SQLite to PostgreSQL migration...")
    print(f"📁 SQLite DB: {SQLITE_DB_PATH}")
    print(f"🗄️  PostgreSQL: {POSTGRES_URL.split('@')[0] + '@***' if '@' in POSTGRES_URL else POSTGRES_URL}")

    # Connect to databases
    sqlite_conn = connect_sqlite()
    postgres_conn = connect_postgres()

    try:
        # Create PostgreSQL tables if needed
        create_postgres_tables_if_needed(postgres_conn)

        # Get table structure from SQLite
        table_info = get_table_structure(sqlite_conn)

        if not table_info:
            print("❌ No tables found in SQLite database")
            return

        # Migration order (to handle foreign key dependencies)
        migration_order = [
            'dish_types',
            'dishes',
            'inventory',
            'dish_ingredients',
            'expenses',
            'inventory_log'
        ]

        total_migrated = 0
        verification_passed = True

        # Migrate each table
        for table_name in migration_order:
            if table_name in table_info:
                migrated_count = migrate_table_data(
                    sqlite_conn, postgres_conn, table_name, table_info[table_name]
                )
                total_migrated += migrated_count

                # Verify migration
                if not verify_migration(sqlite_conn, postgres_conn, table_name):
                    verification_passed = False
            else:
                print(f"⚠️  Table {table_name} not found in SQLite")

        # Migrate any remaining tables not in the order list
        for table_name in table_info:
            if table_name not in migration_order:
                print(f"📤 Migrating additional table: {table_name}")
                migrated_count = migrate_table_data(
                    sqlite_conn, postgres_conn, table_name, table_info[table_name]
                )
                total_migrated += migrated_count

        # Final summary
        print("\n" + "=" * 50)
        print("📊 MIGRATION SUMMARY")
        print("=" * 50)
        print(f"Total tables migrated: {len(table_info)}")
        print(f"Total rows migrated: {total_migrated}")
        print(f"Verification: {'✅ PASSED' if verification_passed else '❌ FAILED'}")

        if verification_passed:
            print("\n🎉 Migration completed successfully!")
            print("You can now update your application to use PostgreSQL.")
        else:
            print("\n⚠️  Migration completed with warnings. Please check the verification failures.")

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        postgres_conn.rollback()
    finally:
        sqlite_conn.close()
        postgres_conn.close()


if __name__ == "__main__":
    # Check if required files/environment variables exist
    if not os.path.exists(SQLITE_DB_PATH):
        print(f"❌ SQLite database not found: {SQLITE_DB_PATH}")
        print("Please ensure the inventory.db file is in the same directory as this script.")
        sys.exit(1)

    if not POSTGRES_URL or POSTGRES_URL == "postgresql://username:password@host:port/database":
        print("❌ PostgreSQL DATABASE_URL not configured")
        print("Please set the DATABASE_URL environment variable or update the script.")
        print("Example: export DATABASE_URL='postgresql://user:pass@host:port/dbname'")
        sys.exit(1)

    main()