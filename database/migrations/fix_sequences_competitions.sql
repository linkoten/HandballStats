-- Fix sequence for competitions table
DO $$
DECLARE
    max_id INTEGER;
BEGIN
    -- Get the current maximum ID from competitions table
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM competitions;
    
    -- Set the sequence to the next value after the maximum ID
    EXECUTE 'ALTER SEQUENCE competitions_id_seq RESTART WITH ' || (max_id + 1);
    
    RAISE NOTICE 'Fixed competitions sequence. Max ID: %, Next sequence value: %', max_id, max_id + 1;
END $$;