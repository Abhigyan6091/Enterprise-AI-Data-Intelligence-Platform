-- Enterprise Data Warehouse Queries
-- Common queries for analytics and reporting

-- 1. Daily Revenue Summary
SELECT 
    DATE_TRUNC('day', order_date) as order_day,
    SUM(total_amount) as daily_revenue,
    COUNT(DISTINCT order_id) as order_count,
    COUNT(DISTINCT customer_id) as unique_customers,
    ROUND(AVG(total_amount), 2) as avg_order_value
FROM orders
WHERE order_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', order_date)
ORDER BY order_day DESC;

-- 2. Customer Lifetime Value (CLV) Calculation
SELECT 
    c.customer_id,
    c.customer_name,
    COUNT(DISTINCT o.order_id) as total_orders,
    SUM(o.total_amount) as lifetime_revenue,
    ROUND(AVG(o.total_amount), 2) as avg_order_value,
    MAX(o.order_date) as last_order_date,
    MIN(o.order_date) as first_order_date,
    DATEDIFF(day, MIN(o.order_date), MAX(o.order_date)) as customer_age_days
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.customer_name
ORDER BY lifetime_revenue DESC;

-- 3. Product Performance Analysis
SELECT 
    p.product_id,
    p.product_name,
    p.category,
    COUNT(ol.order_line_id) as units_sold,
    SUM(ol.quantity) as total_quantity,
    SUM(ol.line_total) as total_revenue,
    ROUND(AVG(ol.unit_price), 2) as avg_price,
    ROUND(SUM(ol.quantity) / COUNT(DISTINCT o.order_id), 2) as avg_units_per_order
FROM products p
LEFT JOIN order_lines ol ON p.product_id = ol.product_id
LEFT JOIN orders o ON ol.order_id = o.order_id
WHERE o.order_date >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY p.product_id, p.product_name, p.category
ORDER BY total_revenue DESC;

-- 4. Geographic Sales Distribution
SELECT 
    c.country,
    c.state_province,
    COUNT(DISTINCT c.customer_id) as customer_count,
    SUM(o.total_amount) as total_sales,
    ROUND(AVG(o.total_amount), 2) as avg_order_value
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
WHERE o.order_date >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY c.country, c.state_province
ORDER BY total_sales DESC;

-- 5. Cohort Analysis - Customer Retention
WITH first_purchase AS (
    SELECT 
        customer_id,
        MIN(DATE_TRUNC('month', order_date)) as cohort_month
    FROM orders
    GROUP BY customer_id
),
user_activity AS (
    SELECT 
        fp.customer_id,
        fp.cohort_month,
        DATE_TRUNC('month', o.order_date) as activity_month,
        ROW_NUMBER() OVER (PARTITION BY fp.customer_id ORDER BY DATE_TRUNC('month', o.order_date)) as purchase_number
    FROM first_purchase fp
    LEFT JOIN orders o ON fp.customer_id = o.customer_id
)
SELECT 
    cohort_month,
    COUNT(DISTINCT customer_id) as cohort_size,
    DATEDIFF(month, cohort_month, activity_month) as months_since_first_purchase,
    COUNT(DISTINCT CASE WHEN purchase_number > 0 THEN customer_id END) as retained_customers,
    ROUND(100.0 * COUNT(DISTINCT CASE WHEN purchase_number > 0 THEN customer_id END) / 
        COUNT(DISTINCT customer_id), 2) as retention_rate
FROM user_activity
GROUP BY cohort_month, DATEDIFF(month, cohort_month, activity_month)
ORDER BY cohort_month DESC, months_since_first_purchase;
