ALTER ROLE "PredictiveMaintenance" CREATEDB;
ALTER DATABASE "PredictiveMaintenancePlatform" OWNER TO "PredictiveMaintenance";
GRANT ALL PRIVILEGES ON DATABASE "PredictiveMaintenancePlatform" TO "PredictiveMaintenance";

\connect "PredictiveMaintenancePlatform"

ALTER SCHEMA public OWNER TO "PredictiveMaintenance";
GRANT ALL ON SCHEMA public TO "PredictiveMaintenance";