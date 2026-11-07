UPDATE appointment_settings SET working_days = '{1,2,3,4,5,6}';
SELECT client_id, working_days, opening_time, closing_time FROM appointment_settings;
