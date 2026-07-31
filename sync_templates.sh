docker exec -i ztreel_postgres_prod psql -U root -d ztreel -c "TRUNCATE TABLE ztteam_templates CASCADE;"
docker exec -i ztreel_postgres_prod psql -U root -d ztreel < local_templates_dump.sql
echo "Templates synced successfully!"
