"""
Example Airflow DAG for data pipeline orchestration.
This DAG demonstrates a typical ETL workflow with quality checks.
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from airflow.sensors.external_task import ExternalTaskSensor
from airflow.utils.task_group import TaskGroup
from airflow.models import Variable

# Default arguments for the DAG
default_args = {
    'owner': 'data-engineering',
    'depends_on_past': False,
    'start_date': datetime(2024, 1, 1),
    'email_on_failure': True,
    'email_on_retry': True,
    'email': ['data-alerts@company.com'],
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
    'execution_timeout': timedelta(hours=2),
}

# DAG definition
dag = DAG(
    dag_id='enterprise_etl_pipeline',
    default_args=default_args,
    description='Enterprise ETL pipeline with data quality checks',
    schedule_interval='0 2 * * *',  # Daily at 2 AM UTC
    catchup=False,
    tags=['production', 'daily'],
)


def extract_data(**context):
    """Extract data from source systems."""
    import psycopg2
    from datetime import datetime
    
    execution_date = context['execution_date']
    
    # Extract from PostgreSQL source
    conn = psycopg2.connect(
        host=Variable.get('SOURCE_DB_HOST'),
        database=Variable.get('SOURCE_DB_NAME'),
        user=Variable.get('SOURCE_DB_USER'),
        password=Variable.get('SOURCE_DB_PASSWORD'),
    )
    
    cursor = conn.cursor()
    query = f"""
        SELECT * FROM orders 
        WHERE created_date::date = '{execution_date.date()}'
    """
    cursor.execute(query)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    
    # Push to XCom for downstream tasks
    context['task_instance'].xcom_push(
        key='extracted_rows',
        value=len(rows)
    )
    
    print(f"Extracted {len(rows)} rows from source")


def validate_data(**context):
    """Validate extracted data quality."""
    rows_count = context['task_instance'].xcom_pull(
        task_ids='extract_data',
        key='extracted_rows'
    )
    
    # Quality checks
    if rows_count == 0:
        raise ValueError("No data extracted from source")
    
    print(f"Validation passed: {rows_count} rows")


def transform_data(**context):
    """Apply transformations to data."""
    import pandas as pd
    
    # Load, clean, and transform data
    print("Applying transformations...")
    
    # Example transformations
    # - Handle nulls
    # - Standardize formats
    # - Denormalize for analytics
    # - Apply business rules
    
    context['task_instance'].xcom_push(
        key='transformed_rows',
        value=1000
    )


def load_data(**context):
    """Load data into warehouse."""
    rows = context['task_instance'].xcom_pull(
        task_ids='transform_data',
        key='transformed_rows'
    )
    
    # Load to analytics warehouse
    print(f"Loading {rows} rows to warehouse...")
    
    # Execute warehouse COPY command or insert


# Define tasks
extract = PythonOperator(
    task_id='extract_data',
    python_callable=extract_data,
    dag=dag,
)

validate = PythonOperator(
    task_id='validate_data',
    python_callable=validate_data,
    dag=dag,
)

transform = PythonOperator(
    task_id='transform_data',
    python_callable=transform_data,
    dag=dag,
)

load = PythonOperator(
    task_id='load_data',
    python_callable=load_data,
    dag=dag,
)

notify_success = BashOperator(
    task_id='notify_success',
    bash_command='echo "Pipeline completed successfully"',
    dag=dag,
)

# Define dependencies
extract >> validate >> transform >> load >> notify_success
