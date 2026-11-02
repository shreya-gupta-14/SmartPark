-- CREATE TABLES


CREATE TABLE rate_card (
    vehicle_type   VARCHAR2(10) PRIMARY KEY,
    rate_per_hour  NUMBER NOT NULL
);

CREATE TABLE slots (
    slot_id     NUMBER PRIMARY KEY,
    slot_type   VARCHAR2(10) NOT NULL,
    is_occupied CHAR(1) DEFAULT 'N'
);

CREATE TABLE vehicles (
    vehicle_no    VARCHAR2(15) PRIMARY KEY,
    owner_name    VARCHAR2(50),
    vehicle_type  VARCHAR2(10) NOT NULL
);

CREATE TABLE parking_log (
    log_id       NUMBER PRIMARY KEY,
    vehicle_no   VARCHAR2(15) REFERENCES vehicles(vehicle_no),
    slot_id      NUMBER REFERENCES slots(slot_id),
    entry_time   DATE,
    exit_time    DATE,
    bill_amount  NUMBER
);

CREATE SEQUENCE log_seq START WITH 1 INCREMENT BY 1;


-- ========================================
-- STEP 2: INSERT SAMPLE DATA
-- ========================================

INSERT INTO rate_card VALUES ('CAR', 20);
INSERT INTO rate_card VALUES ('BIKE', 10);

INSERT INTO slots VALUES (1, 'CAR', 'N');
INSERT INTO slots VALUES (2, 'CAR', 'N');
INSERT INTO slots VALUES (3, 'BIKE', 'N');
INSERT INTO slots VALUES (4, 'BIKE', 'N');

COMMIT;



-- FUNCTION - CALCULATE BILL


CREATE OR REPLACE FUNCTION calc_bill(
    p_entry   IN DATE,
    p_exit    IN DATE,
    p_vtype   IN VARCHAR2
) RETURN NUMBER
IS
    v_hours  NUMBER;
    v_rate   NUMBER;
BEGIN
    v_hours := CEIL((p_exit - p_entry) * 24);
    IF v_hours = 0 THEN v_hours := 1; END IF;

    SELECT rate_per_hour INTO v_rate
    FROM rate_card WHERE vehicle_type = p_vtype;

    RETURN v_hours * v_rate;
END;
/



--PROCEDURE - ALLOCATE SLOT ON ENTRY


CREATE OR REPLACE PROCEDURE allocate_slot(
    p_vehicle_no  IN VARCHAR2,
    p_owner       IN VARCHAR2,
    p_vtype       IN VARCHAR2
)
IS
    v_slot_id     NUMBER;
    v_count       NUMBER;
BEGIN
    SELECT slot_id INTO v_slot_id
    FROM slots
    WHERE slot_type = p_vtype AND is_occupied = 'N'
    AND ROWNUM = 1;

    SELECT COUNT(*) INTO v_count
    FROM vehicles
    WHERE vehicle_no = p_vehicle_no;

    IF v_count = 0 THEN
        INSERT INTO vehicles (vehicle_no, owner_name, vehicle_type)
        VALUES (p_vehicle_no, p_owner, p_vtype);
    END IF;

    UPDATE slots SET is_occupied = 'Y' WHERE slot_id = v_slot_id;

    INSERT INTO parking_log (log_id, vehicle_no, slot_id, entry_time)
    VALUES (log_seq.NEXTVAL, p_vehicle_no, v_slot_id, SYSDATE);

    DBMS_OUTPUT.PUT_LINE('Slot ' || v_slot_id || ' allocated to ' || p_vehicle_no);

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        DBMS_OUTPUT.PUT_LINE('No free ' || p_vtype || ' slot available.');
END;
/



-- TRIGGER - AUTO BILL ON EXIT


CREATE OR REPLACE TRIGGER trg_auto_bill
BEFORE UPDATE OF exit_time ON parking_log
FOR EACH ROW
DECLARE
    v_vtype VARCHAR2(10);
BEGIN
    SELECT vehicle_type INTO v_vtype
    FROM vehicles WHERE vehicle_no = :NEW.vehicle_no;

    :NEW.bill_amount := calc_bill(:OLD.entry_time, :NEW.exit_time, v_vtype);

    UPDATE slots SET is_occupied = 'N' WHERE slot_id = :NEW.slot_id;
END;
/


-- TEST THE FLOW


SET SERVEROUTPUT ON;

EXEC allocate_slot('PB10AB1234', 'Shreya', 'CAR');

UPDATE parking_log
SET exit_time = SYSDATE + (1/24)
WHERE vehicle_no = 'PB10AB1234' AND exit_time IS NULL;

SELECT * FROM parking_log;



-- CURSOR - DAILY REPORT


DECLARE
    CURSOR c_report IS
        SELECT vehicle_no, entry_time, exit_time, bill_amount
        FROM parking_log
        WHERE exit_time IS NOT NULL;
    v_total NUMBER := 0;
BEGIN
    DBMS_OUTPUT.PUT_LINE('---- Daily Parking Report ----');
    FOR rec IN c_report LOOP
        DBMS_OUTPUT.PUT_LINE(rec.vehicle_no || ' | Bill: Rs.' || rec.bill_amount);
        v_total := v_total + rec.bill_amount;
    END LOOP;
    DBMS_OUTPUT.PUT_LINE('Total Revenue: Rs.' || v_total);
END;
/


-- TEST "NO SLOT AVAILABLE" CASE


EXEC allocate_slot('PB10CD5678', 'Test User', 'CAR');
EXEC allocate_slot('PB10EF9999', 'Test User 2', 'CAR');
-- both CAR slots now full — run this third one to see the exception fire:
EXEC allocate_slot('PB10GH0000', 'Test User 3', 'CAR');