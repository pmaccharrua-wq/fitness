-- New warmup, mobility, and stretch exercises to add to Supabase
-- Run this in Supabase SQL Editor

INSERT INTO exercise_library (id, name, name_pt, primary_muscles, secondary_muscles, equipment, difficulty, image_url, video_url, instructions, instructions_pt) VALUES
('hip_circles', 'Hip Circles', 'Mobilidade de quadril (círculos)', ARRAY['hips'], ARRAY['core'], 'bodyweight', 'beginner', 'https://www.inspireusafoundation.org/wp-content/uploads/2022/06/hip-circles.gif', 'https://www.youtube.com/watch?v=QxCOEozHnMs', 'Stand on one leg, make large circles with raised knee, switch sides', 'Fique num pé só, faça círculos grandes com o joelho levantado, troque de lado'),

('ankle_mobility', 'Ankle Mobility', 'Mobilidade de tornozelos', ARRAY['calves'], ARRAY['ankles'], 'bodyweight', 'beginner', 'https://www.inspireusafoundation.org/wp-content/uploads/2022/04/ankle-circles.gif', 'https://www.youtube.com/watch?v=tgeVo1luU4Y', 'Rotate ankles in circles, flex and point toes to warm up joints', 'Rode os tornozelos em círculos, flexione e estique os dedos para aquecer as articulações'),

('pause_squat', 'Pause Squat', 'Agachamento com pausa no fundo', ARRAY['quadriceps', 'glutes'], ARRAY['core', 'hamstrings'], 'bodyweight', 'intermediate', 'https://www.inspireusafoundation.org/wp-content/uploads/2023/03/air-squat.gif', 'https://www.youtube.com/watch?v=aclHkVaku9U', 'Squat down, pause for 2-3 seconds at the bottom, then stand up', 'Agache, pause 2-3 segundos no fundo, depois levante'),

('dumbbell_lunge', 'Dumbbell Lunge', 'Passada (lunge) com halteres', ARRAY['quadriceps', 'glutes'], ARRAY['hamstrings', 'calves'], 'dumbbells', 'intermediate', 'https://www.inspireusafoundation.org/wp-content/uploads/2022/10/walking-lunges.gif', 'https://www.youtube.com/watch?v=D7KaRcUTQeE', 'Hold dumbbells at sides, step forward into lunge, alternate legs', 'Segure halteres nas laterais, dê um passo à frente numa passada, alterne as pernas'),

('hamstring_stretch', 'Hamstring Stretch', 'Alongamento de isquiotibiais', ARRAY['hamstrings'], ARRAY['lower back'], 'bodyweight', 'beginner', 'https://www.inspireusafoundation.org/wp-content/uploads/2022/10/standing-hamstring-stretch.gif', 'https://www.youtube.com/watch?v=FDwpEdxZ4H4', 'Extend one leg forward, hinge at hips, reach toward toes, hold 20-30 seconds', 'Estenda uma perna à frente, incline no quadril, alcance os dedos dos pés, segure 20-30 segundos'),

('pigeon_stretch', 'Pigeon Pose Stretch', 'Alongamento de glúteos (posição de pombo)', ARRAY['glutes'], ARRAY['hips', 'piriformis'], 'bodyweight', 'beginner', 'https://www.inspireusafoundation.org/wp-content/uploads/2022/08/pigeon-pose.gif', 'https://www.youtube.com/watch?v=UKwkChzThig', 'One leg bent in front, other extended back, lean forward and hold', 'Uma perna dobrada à frente, outra estendida atrás, incline para frente e segure'),

('calf_stretch', 'Calf Stretch', 'Alongamento de panturrilhas', ARRAY['calves'], ARRAY['achilles'], 'bodyweight', 'beginner', 'https://www.inspireusafoundation.org/wp-content/uploads/2022/09/calf-stretch.gif', 'https://www.youtube.com/watch?v=u_sfQX5JKWQ', 'Step one foot back, press heel to floor, lean forward, hold 20-30 seconds', 'Recue um pé, pressione o calcanhar no chão, incline para frente, segure 20-30 segundos'),

('bicep_wall_stretch', 'Bicep Wall Stretch', 'Alongamento de bíceps (mão na parede)', ARRAY['biceps'], ARRAY['shoulders', 'chest'], 'bodyweight', 'beginner', 'https://www.inspireusafoundation.org/wp-content/uploads/2022/11/bicep-stretch.gif', 'https://www.youtube.com/watch?v=iME7lnPnWHs', 'Place palm on wall behind you, rotate body away to stretch bicep', 'Coloque a palma na parede atrás de si, rode o corpo para alongar o bíceps'),

('tricep_overhead_stretch', 'Overhead Tricep Stretch', 'Alongamento de tríceps acima da cabeça', ARRAY['triceps'], ARRAY['shoulders'], 'bodyweight', 'beginner', 'https://www.inspireusafoundation.org/wp-content/uploads/2022/03/tricep-stretch.gif', 'https://www.youtube.com/watch?v=4aoUZEZFJF8', 'Raise arm overhead, bend elbow, use other hand to gently push elbow down', 'Levante o braço acima da cabeça, dobre o cotovelo, use a outra mão para empurrar suavemente o cotovelo para baixo')

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_pt = EXCLUDED.name_pt,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  equipment = EXCLUDED.equipment,
  difficulty = EXCLUDED.difficulty,
  image_url = EXCLUDED.image_url,
  video_url = EXCLUDED.video_url,
  instructions = EXCLUDED.instructions,
  instructions_pt = EXCLUDED.instructions_pt;
