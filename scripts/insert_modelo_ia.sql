-- Insertar registro del modelo de IA en la base de datos
-- Este script registra el modelo de regresión logística entrenado

USE diabetes_ia;

-- Verificar si ya existe un modelo activo
SELECT id_modelo, version, activo FROM modelo_ia WHERE activo = TRUE;

-- Si no existe, insertar el modelo
INSERT INTO modelo_ia (
    version, 
    fecha_entrenamiento, 
    accuracy, 
    n_samples_train, 
    n_samples_test, 
    features, 
    parametros, 
    activo
) VALUES (
    'v1.0-LogisticRegression',
    '2025-11-20 23:06:44',
    0.9789,
    757,
    190,
    JSON_ARRAY('Gender', 'AGE', 'Urea', 'Cr', 'HbA1c', 'Chol', 'TG', 'HDL', 'LDL', 'VLDL', 'BMI'),
    JSON_OBJECT(
        'algorithm', 'Logistic Regression',
        'feature_importance', JSON_OBJECT(
            'Gender', 0.318,
            'AGE', 0.229,
            'Urea', 0.110,
            'Cr', -0.043,
            'HbA1c', 2.363,
            'Chol', 0.954,
            'TG', 0.961,
            'HDL', 0.292,
            'LDL', 0.048,
            'VLDL', 0.225,
            'BMI', 2.869
        )
    ),
    TRUE
)
ON DUPLICATE KEY UPDATE 
    activo = TRUE,
    fecha_registro = NOW();

-- Verificar inserción
SELECT * FROM modelo_ia WHERE activo = TRUE;
