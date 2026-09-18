# Modelo de Datos Principal (PostgreSQL Schema)

```sql
-- Tabla de Pacientes
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    document_id VARCHAR(50),
    phone VARCHAR(30),
    email VARCHAR(150),
    birth_date DATE NOT NULL,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    medical_conditions TEXT[],
    allergies TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Evaluaciones Antropométricas
CREATE TABLE anthropometric_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    evaluation_date DATE NOT NULL,
    weight_kg NUMERIC(5,2) NOT NULL,
    height_cm NUMERIC(5,2) NOT NULL,
    waist_cm NUMERIC(5,2),
    hip_cm NUMERIC(5,2),
    triceps_fold_mm NUMERIC(4,1),
    subscapular_fold_mm NUMERIC(4,1),
    suprailiac_fold_mm NUMERIC(4,1),
    abdominal_fold_mm NUMERIC(4,1),
    body_fat_percentage NUMERIC(4,2),
    muscle_mass_kg NUMERIC(5,2),
    bmi NUMERIC(4,2),
    bmr_kcal INT,
    tdee_kcal INT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Planes Alimenticios
CREATE TABLE meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    target_calories INT NOT NULL,
    protein_grams INT NOT NULL,
    carbs_grams INT NOT NULL,
    fats_grams INT NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    structure_json JSONB NOT NULL, -- Menús por tiempos de comida
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```
