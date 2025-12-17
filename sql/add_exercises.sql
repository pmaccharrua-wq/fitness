-- SQL Script to add exercises for Gym Bench, Dumbbell, Kettlebell, and Yoga/Stability Ball
-- Run this in your Supabase SQL editor

INSERT INTO exercise_library (id, name, name_pt, primary_muscles, secondary_muscles, equipment, difficulty, image_url, video_url, instructions, instructions_pt)
VALUES

-- =============================================
-- GYM BENCH EXERCISES
-- =============================================

-- Bench Step-Ups
('bench_step_up', 'Bench Step-Up', 'Step-Up no Banco', 
 ARRAY['quadriceps', 'glutes'], ARRAY['hamstrings', 'calves', 'core'],
 'bench', 'beginner',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/04/dumbbell-step-up.gif',
 'https://www.youtube.com/watch?v=dQqApCGd5Ss',
 'Step onto bench with one foot, drive through heel to stand tall, lower with control. Alternate legs or complete all reps on one side.',
 'Suba no banco com um pé, empurre pelo calcanhar para ficar em pé, desça com controlo. Alterne as pernas ou complete todas as repetições de um lado.'),

-- Bench Hip Thrust
('bench_hip_thrust', 'Bench Hip Thrust', 'Hip Thrust no Banco',
 ARRAY['glutes', 'hamstrings'], ARRAY['core', 'quadriceps'],
 'bench', 'beginner',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/10/barbell-hip-thrust.gif',
 'https://www.youtube.com/watch?v=SEdqd1n0cvg',
 'Sit with upper back against bench edge, feet flat on floor. Drive hips up until body forms straight line, squeeze glutes at top, lower slowly.',
 'Sente com a parte superior das costas contra a borda do banco, pés apoiados no chão. Eleve os quadris até formar uma linha reta, aperte os glúteos no topo, desça lentamente.'),

-- Bench Tricep Dips
('bench_tricep_dip', 'Bench Tricep Dip', 'Tricep Dip no Banco',
 ARRAY['triceps'], ARRAY['shoulders', 'chest'],
 'bench', 'beginner',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/08/bench-dips.gif',
 'https://www.youtube.com/watch?v=0326dy_-CzM',
 'Place hands on bench behind you, legs extended. Lower body by bending elbows to 90 degrees, push back up. Keep elbows close to body.',
 'Coloque as mãos no banco atrás de você, pernas estendidas. Baixe o corpo dobrando os cotovelos a 90 graus, empurre para cima. Mantenha os cotovelos perto do corpo.'),

-- Bench Box Jump
('bench_box_jump', 'Bench Box Jump', 'Salto no Banco',
 ARRAY['quadriceps', 'glutes'], ARRAY['calves', 'hamstrings', 'core'],
 'bench', 'intermediate',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/05/box-jump.gif',
 'https://www.youtube.com/watch?v=52r_Ul5k03g',
 'Stand facing bench, swing arms and jump onto bench landing softly with bent knees. Step down and repeat.',
 'Fique de frente para o banco, balance os braços e salte para o banco aterrissando suavemente com os joelhos dobrados. Desça e repita.'),

-- Single Leg Squat to Bench
('single_leg_squat_bench', 'Single Leg Squat to Bench', 'Agachamento Unilateral no Banco',
 ARRAY['quadriceps', 'glutes'], ARRAY['hamstrings', 'core'],
 'bench', 'intermediate',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/11/single-leg-squat.gif',
 'https://www.youtube.com/watch?v=P8kFkpOoqvs',
 'Stand on one leg in front of bench. Lower until you gently touch bench, then stand back up. Keep non-working leg forward.',
 'Fique em um pé na frente do banco. Desça até tocar suavemente o banco, depois levante-se. Mantenha a perna que não trabalha à frente.'),

-- Bench Reverse Hyperextension
('bench_reverse_hyper', 'Bench Reverse Hyperextension', 'Hiperextensão Reversa no Banco',
 ARRAY['glutes', 'hamstrings'], ARRAY['back', 'core'],
 'bench', 'beginner',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/09/reverse-hyperextension.gif',
 'https://www.youtube.com/watch?v=5_bV9dZbMOc',
 'Lie face down on bench with hips at edge, legs hanging. Raise legs until level with body, squeeze glutes, lower with control.',
 'Deite de bruços no banco com os quadris na borda, pernas penduradas. Eleve as pernas até ficarem niveladas com o corpo, aperte os glúteos, desça com controlo.'),

-- =============================================
-- DUMBBELL EXERCISES
-- =============================================

-- Dumbbell Goblet Squat
('dumbbell_goblet_squat', 'Dumbbell Goblet Squat', 'Agachamento Cálice com Haltere',
 ARRAY['quadriceps', 'glutes'], ARRAY['hamstrings', 'core'],
 'dumbbell', 'beginner',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/04/dumbbell-goblet-squat.gif',
 'https://www.youtube.com/watch?v=MeIiIdhvXT4',
 'Hold dumbbell vertically at chest with both hands. Squat down keeping chest up, drive through heels to stand.',
 'Segure o haltere verticalmente no peito com as duas mãos. Agache mantendo o peito erguido, empurre pelos calcanhares para levantar.'),

-- Dumbbell Deadlift
('dumbbell_deadlift', 'Dumbbell Deadlift', 'Levantamento Terra com Halteres',
 ARRAY['glutes', 'hamstrings', 'back'], ARRAY['core', 'quadriceps'],
 'dumbbell', 'beginner',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/06/dumbbell-deadlift.gif',
 'https://www.youtube.com/watch?v=lJ3QwaXNJfw',
 'Hold dumbbells at sides, hinge at hips keeping back flat, lower weights along legs, drive hips forward to stand.',
 'Segure halteres nas laterais, curve nos quadris mantendo as costas retas, baixe os pesos ao longo das pernas, empurre os quadris para frente para levantar.'),

-- Dumbbell Pullover
('dumbbell_pullover', 'Dumbbell Pullover', 'Pullover com Haltere',
 ARRAY['chest', 'back'], ARRAY['triceps', 'core'],
 'dumbbell', 'intermediate',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/10/dumbbell-pullover.gif',
 'https://www.youtube.com/watch?v=FK4rHfWKEac',
 'Lie on bench, hold dumbbell with both hands above chest. Lower weight behind head with slight elbow bend, pull back to start.',
 'Deite no banco, segure o haltere com as duas mãos acima do peito. Baixe o peso atrás da cabeça com leve flexão do cotovelo, puxe de volta ao início.'),

-- Dumbbell Renegade Row
('dumbbell_renegade_row', 'Dumbbell Renegade Row', 'Remada Renegada com Halteres',
 ARRAY['back', 'core'], ARRAY['biceps', 'shoulders', 'chest'],
 'dumbbell', 'advanced',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/09/dumbbell-renegade-row.gif',
 'https://www.youtube.com/watch?v=GS1RCR2mHJY',
 'Start in push-up position gripping dumbbells. Row one dumbbell to hip while balancing, lower and repeat other side.',
 'Comece na posição de flexão segurando halteres. Reme um haltere até à anca enquanto equilibra, desça e repita do outro lado.'),

-- Dumbbell Skull Crusher
('dumbbell_skull_crusher', 'Dumbbell Skull Crusher', 'Tríceps Testa com Halteres',
 ARRAY['triceps'], ARRAY['shoulders'],
 'dumbbell', 'intermediate',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/10/dumbbell-skull-crusher.gif',
 'https://www.youtube.com/watch?v=ir5PsbniVSc',
 'Lie on bench with dumbbells extended above chest. Bend elbows to lower weights toward forehead, extend back up.',
 'Deite no banco com halteres estendidos acima do peito. Flexione os cotovelos para baixar os pesos em direção à testa, estenda de volta.'),

-- Dumbbell Reverse Fly
('dumbbell_reverse_fly', 'Dumbbell Reverse Fly', 'Crucifixo Inverso com Halteres',
 ARRAY['shoulders', 'back'], ARRAY['trapezius'],
 'dumbbell', 'beginner',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/09/dumbbell-reverse-fly.gif',
 'https://www.youtube.com/watch?v=T8xgsuRT2F0',
 'Bend at hips, let dumbbells hang. Raise arms out to sides squeezing shoulder blades together, lower with control.',
 'Curve nos quadris, deixe os halteres pendurados. Eleve os braços para os lados apertando as omoplatas, desça com controlo.'),

-- Dumbbell Concentration Curl
('dumbbell_concentration_curl', 'Dumbbell Concentration Curl', 'Rosca Concentrada com Haltere',
 ARRAY['biceps'], ARRAY['forearms'],
 'dumbbell', 'beginner',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/03/concentration-curl.gif',
 'https://www.youtube.com/watch?v=Jvj2wV0vOYU',
 'Sit on bench, brace elbow against inner thigh. Curl weight toward shoulder, lower slowly. Focus on bicep contraction.',
 'Sente no banco, apoie o cotovelo contra a coxa interna. Curl o peso em direção ao ombro, desça lentamente. Foque na contração do bíceps.'),

-- Dumbbell Upright Row
('dumbbell_upright_row', 'Dumbbell Upright Row', 'Remada Alta com Halteres',
 ARRAY['shoulders', 'trapezius'], ARRAY['biceps'],
 'dumbbell', 'intermediate',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/09/dumbbell-upright-row.gif',
 'https://www.youtube.com/watch?v=amCU-ziHITM',
 'Stand holding dumbbells in front of thighs. Pull weights up along body to chest height, elbows leading, lower slowly.',
 'Fique em pé segurando halteres na frente das coxas. Puxe os pesos para cima ao longo do corpo até a altura do peito, cotovelos liderando, desça lentamente.'),

-- Dumbbell Shrug
('dumbbell_shrug', 'Dumbbell Shrug', 'Encolhimento de Ombros com Halteres',
 ARRAY['trapezius'], ARRAY['shoulders'],
 'dumbbell', 'beginner',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/08/dumbbell-shrug.gif',
 'https://www.youtube.com/watch?v=cJRVVxmytaM',
 'Stand holding heavy dumbbells at sides. Shrug shoulders up toward ears, hold briefly, lower slowly.',
 'Fique em pé segurando halteres pesados nas laterais. Encolha os ombros em direção às orelhas, segure brevemente, desça lentamente.'),

-- Dumbbell Sumo Squat
('dumbbell_sumo_squat', 'Dumbbell Sumo Squat', 'Agachamento Sumo com Haltere',
 ARRAY['quadriceps', 'glutes', 'adductors'], ARRAY['hamstrings', 'core'],
 'dumbbell', 'beginner',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/03/dumbbell-sumo-squat.gif',
 'https://www.youtube.com/watch?v=9ZuXKqRbT9k',
 'Stand with wide stance, toes pointed out, hold dumbbell between legs. Squat down keeping chest up, drive through heels.',
 'Fique com postura ampla, dedos apontando para fora, segure haltere entre as pernas. Agache mantendo o peito erguido, empurre pelos calcanhares.'),

-- Dumbbell Thruster
('dumbbell_thruster', 'Dumbbell Thruster', 'Thruster com Halteres',
 ARRAY['quadriceps', 'shoulders', 'glutes'], ARRAY['triceps', 'core'],
 'dumbbell', 'intermediate',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/11/dumbbell-thruster.gif',
 'https://www.youtube.com/watch?v=gU-b1VxWNhY',
 'Hold dumbbells at shoulders, squat down. Drive up explosively and press weights overhead in one fluid motion.',
 'Segure halteres nos ombros, agache. Empurre explosivamente e pressione os pesos acima da cabeça num movimento fluido.'),

-- Dumbbell Calf Raise
('dumbbell_calf_raise', 'Dumbbell Calf Raise', 'Elevação de Panturrilha com Halteres',
 ARRAY['calves'], ARRAY[]::text[],
 'dumbbell', 'beginner',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/10/single-leg-calf-raise.gif',
 'https://www.youtube.com/watch?v=c5Kv6-fnTj8',
 'Hold dumbbells at sides, stand on edge of step. Raise heels as high as possible, lower below step level for stretch.',
 'Segure halteres nas laterais, fique na borda de um degrau. Eleve os calcanhares o máximo possível, desça abaixo do nível do degrau para alongar.'),

-- Dumbbell Walking Lunge
('dumbbell_walking_lunge', 'Dumbbell Walking Lunge', 'Passada em Caminhada com Halteres',
 ARRAY['quadriceps', 'glutes'], ARRAY['hamstrings', 'core'],
 'dumbbell', 'intermediate',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/11/dumbbell-walking-lunges.gif',
 'https://www.youtube.com/watch?v=L8fvypPrzzs',
 'Hold dumbbells at sides. Step forward into lunge, lower back knee toward ground, push through front heel to step into next lunge.',
 'Segure halteres nas laterais. Passo à frente em afundo, baixe o joelho de trás em direção ao chão, empurre pelo calcanhar da frente para o próximo afundo.'),

-- Dumbbell Arnold Press
('dumbbell_arnold_press', 'Dumbbell Arnold Press', 'Arnold Press com Halteres',
 ARRAY['shoulders'], ARRAY['triceps', 'trapezius'],
 'dumbbell', 'intermediate',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/08/arnold-press.gif',
 'https://www.youtube.com/watch?v=6Z15_WdXmVw',
 'Start with dumbbells at chest, palms facing you. Rotate wrists outward while pressing overhead, reverse on descent.',
 'Comece com halteres no peito, palmas viradas para você. Gire os pulsos para fora enquanto pressiona para cima, inverta na descida.'),

-- =============================================
-- KETTLEBELL EXERCISES
-- =============================================

-- Kettlebell Turkish Get-Up
('kettlebell_turkish_getup', 'Kettlebell Turkish Get-Up', 'Levantamento Turco com Kettlebell',
 ARRAY['core', 'shoulders'], ARRAY['glutes', 'quadriceps', 'back'],
 'kettlebell', 'advanced',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/08/turkish-get-up.gif',
 'https://www.youtube.com/watch?v=0bWRPC6-bWE',
 'Lie on back holding kettlebell overhead. Stand up through a series of movements keeping arm locked out, then reverse.',
 'Deite de costas segurando o kettlebell acima. Levante-se através de uma série de movimentos mantendo o braço travado, depois inverta.'),

-- Kettlebell Clean
('kettlebell_clean', 'Kettlebell Clean', 'Clean com Kettlebell',
 ARRAY['shoulders', 'back'], ARRAY['core', 'legs'],
 'kettlebell', 'intermediate',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/08/kettlebell-clean.gif',
 'https://www.youtube.com/watch?v=mwIvCdQ3eXA',
 'Start with kettlebell between legs. Explosively pull to rack position at shoulder, rotating wrist to avoid slamming arm.',
 'Comece com kettlebell entre as pernas. Puxe explosivamente para posição rack no ombro, girando o pulso para evitar bater no braço.'),

-- Kettlebell Snatch
('kettlebell_snatch', 'Kettlebell Snatch', 'Snatch com Kettlebell',
 ARRAY['shoulders', 'back', 'glutes'], ARRAY['core', 'hamstrings'],
 'kettlebell', 'advanced',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/08/kettlebell-snatch.gif',
 'https://www.youtube.com/watch?v=nYP9Vq2JnEI',
 'Swing kettlebell between legs, explosively drive hips and pull weight overhead in one motion, punch through at top.',
 'Balance o kettlebell entre as pernas, empurre explosivamente os quadris e puxe o peso acima da cabeça num movimento, soque no topo.'),

-- Kettlebell Windmill
('kettlebell_windmill', 'Kettlebell Windmill', 'Moinho com Kettlebell',
 ARRAY['core', 'shoulders'], ARRAY['hamstrings', 'glutes', 'back'],
 'kettlebell', 'intermediate',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/08/kettlebell-windmill.gif',
 'https://www.youtube.com/watch?v=iEfvlhVsGNw',
 'Hold kettlebell overhead, feet angled. Hinge at hip pushing it back, reach opposite hand toward ground, keep eyes on weight.',
 'Segure kettlebell acima da cabeça, pés angulados. Curve no quadril empurrando-o para trás, alcance a mão oposta em direção ao chão, mantenha os olhos no peso.'),

-- Kettlebell High Pull
('kettlebell_high_pull', 'Kettlebell High Pull', 'Puxada Alta com Kettlebell',
 ARRAY['shoulders', 'back'], ARRAY['core', 'glutes', 'hamstrings'],
 'kettlebell', 'intermediate',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/10/kettlebell-high-pull.gif',
 'https://www.youtube.com/watch?v=k9aW0mCbksk',
 'Swing kettlebell, at top of swing pull elbow back and up bringing weight to shoulder height, let it fall back to swing.',
 'Balance o kettlebell, no topo do balanço puxe o cotovelo para trás e para cima trazendo o peso à altura do ombro, deixe cair de volta ao balanço.'),

-- Kettlebell Halo
('kettlebell_halo', 'Kettlebell Halo', 'Halo com Kettlebell',
 ARRAY['shoulders', 'core'], ARRAY['triceps', 'back'],
 'kettlebell', 'beginner',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/08/kettlebell-halo.gif',
 'https://www.youtube.com/watch?v=UcJf1_A3mSM',
 'Hold kettlebell upside down at chest. Circle it around your head keeping elbows close, alternate directions.',
 'Segure kettlebell de cabeça para baixo no peito. Circule-o ao redor da cabeça mantendo os cotovelos perto, alterne as direções.'),

-- Kettlebell Sumo Deadlift
('kettlebell_sumo_deadlift', 'Kettlebell Sumo Deadlift', 'Levantamento Terra Sumo com Kettlebell',
 ARRAY['glutes', 'quadriceps', 'hamstrings'], ARRAY['back', 'core'],
 'kettlebell', 'beginner',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/06/kettlebell-sumo-deadlift.gif',
 'https://www.youtube.com/watch?v=UKt7VqZ-hWg',
 'Stand with wide stance, kettlebell between legs. Hinge at hips, grip kettlebell, drive through heels to stand.',
 'Fique com postura ampla, kettlebell entre as pernas. Curve nos quadris, agarre o kettlebell, empurre pelos calcanhares para levantar.'),

-- Kettlebell Figure 8
('kettlebell_figure_8', 'Kettlebell Figure 8', 'Oito com Kettlebell',
 ARRAY['core', 'back'], ARRAY['shoulders', 'glutes'],
 'kettlebell', 'intermediate',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/09/kettlebell-figure-8.gif',
 'https://www.youtube.com/watch?v=yS5M-1qBIVc',
 'Stand in partial squat, pass kettlebell between legs in figure-8 pattern, alternating hands front and back.',
 'Fique em agachamento parcial, passe o kettlebell entre as pernas em padrão de oito, alternando as mãos na frente e atrás.'),

-- Kettlebell Single Leg Deadlift
('kettlebell_single_leg_dl', 'Kettlebell Single Leg Deadlift', 'Levantamento Terra Unilateral com Kettlebell',
 ARRAY['hamstrings', 'glutes'], ARRAY['core', 'back'],
 'kettlebell', 'intermediate',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/06/single-leg-romanian-deadlift.gif',
 'https://www.youtube.com/watch?v=Eh-w1fDRD0o',
 'Stand on one leg holding kettlebell. Hinge forward letting back leg rise, touch kettlebell toward ground, return upright.',
 'Fique em uma perna segurando kettlebell. Curve para frente deixando a perna de trás subir, toque o kettlebell em direção ao chão, retorne ereto.'),

-- Kettlebell Thruster
('kettlebell_thruster', 'Kettlebell Thruster', 'Thruster com Kettlebell',
 ARRAY['quadriceps', 'shoulders', 'glutes'], ARRAY['triceps', 'core'],
 'kettlebell', 'intermediate',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/11/kettlebell-thruster.gif',
 'https://www.youtube.com/watch?v=QDGrP1GfVnU',
 'Hold kettlebell at shoulder in rack position. Squat down, drive up explosively pressing weight overhead.',
 'Segure kettlebell no ombro em posição rack. Agache, empurre explosivamente pressionando o peso acima da cabeça.'),

-- Kettlebell Farmer Carry
('kettlebell_farmer_carry', 'Kettlebell Farmer Carry', 'Farmer Carry com Kettlebells',
 ARRAY['core', 'forearms'], ARRAY['shoulders', 'trapezius', 'back'],
 'kettlebell', 'beginner',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/09/farmers-carry.gif',
 'https://www.youtube.com/watch?v=nHEnw8uJKzI',
 'Hold heavy kettlebells at sides. Walk with controlled steps, keeping core tight and shoulders back.',
 'Segure kettlebells pesados nas laterais. Caminhe com passos controlados, mantendo o core apertado e os ombros para trás.'),

-- =============================================
-- YOGA BALL / STABILITY BALL EXERCISES
-- =============================================

-- Stability Ball Pike
('stability_ball_pike', 'Stability Ball Pike', 'Pike na Bola de Estabilidade',
 ARRAY['core', 'shoulders'], ARRAY['chest', 'back'],
 'stability ball', 'advanced',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/10/stability-ball-pike.gif',
 'https://www.youtube.com/watch?v=WxE7LEPehbg',
 'Start in push-up position with feet on ball. Pike hips up rolling ball toward hands, lower with control.',
 'Comece na posição de flexão com os pés na bola. Eleve os quadris rolando a bola em direção às mãos, desça com controlo.'),

-- Stability Ball Jackknife
('stability_ball_jackknife', 'Stability Ball Jackknife', 'Jackknife na Bola de Estabilidade',
 ARRAY['core'], ARRAY['hip flexors', 'shoulders'],
 'stability ball', 'intermediate',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/10/stability-ball-jackknife.gif',
 'https://www.youtube.com/watch?v=rjmJWMp3FKU',
 'Start in push-up position with shins on ball. Pull knees toward chest rolling ball forward, extend back.',
 'Comece na posição de flexão com as canelas na bola. Puxe os joelhos em direção ao peito rolando a bola para frente, estenda de volta.'),

-- Stability Ball Russian Twist
('stability_ball_russian_twist', 'Stability Ball Russian Twist', 'Torção Russa na Bola',
 ARRAY['core', 'obliques'], ARRAY['shoulders'],
 'stability ball', 'intermediate',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/09/exercise-ball-russian-twist.gif',
 'https://www.youtube.com/watch?v=6hZOx-mRbxo',
 'Lie with upper back on ball, hips raised, arms extended. Rotate torso side to side keeping hips stable.',
 'Deite com a parte superior das costas na bola, quadris elevados, braços estendidos. Gire o tronco de um lado para o outro mantendo os quadris estáveis.'),

-- Stability Ball Leg Curl
('stability_ball_leg_curl', 'Stability Ball Leg Curl', 'Leg Curl na Bola de Estabilidade',
 ARRAY['hamstrings', 'glutes'], ARRAY['core'],
 'stability ball', 'intermediate',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/10/stability-ball-hamstring-curl.gif',
 'https://www.youtube.com/watch?v=hAGfBjvIRFE',
 'Lie on back, heels on ball, lift hips. Curl ball toward glutes, extend back out keeping hips elevated.',
 'Deite de costas, calcanhares na bola, eleve os quadris. Curve a bola em direção aos glúteos, estenda de volta mantendo os quadris elevados.'),

-- Stability Ball Push-Up
('stability_ball_pushup', 'Stability Ball Push-Up', 'Flexão na Bola de Estabilidade',
 ARRAY['chest', 'triceps'], ARRAY['shoulders', 'core'],
 'stability ball', 'intermediate',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/11/stability-ball-push-up.gif',
 'https://www.youtube.com/watch?v=sS8cLsA2NTQ',
 'Place hands on ball in push-up position. Lower chest to ball keeping core tight, push back up.',
 'Coloque as mãos na bola em posição de flexão. Baixe o peito até à bola mantendo o core apertado, empurre para cima.'),

-- Stability Ball Dead Bug
('stability_ball_dead_bug', 'Stability Ball Dead Bug', 'Dead Bug na Bola',
 ARRAY['core'], ARRAY['hip flexors'],
 'stability ball', 'beginner',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/10/dead-bug.gif',
 'https://www.youtube.com/watch?v=4XLEnwUr1d8',
 'Lie on back holding ball between hands and knees. Extend opposite arm and leg, return and alternate.',
 'Deite de costas segurando a bola entre mãos e joelhos. Estenda braço e perna opostos, retorne e alterne.'),

-- Stability Ball Rollout
('stability_ball_rollout', 'Stability Ball Rollout', 'Rollout na Bola',
 ARRAY['core'], ARRAY['shoulders', 'back'],
 'stability ball', 'intermediate',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/09/stability-ball-rollout.gif',
 'https://www.youtube.com/watch?v=9VaMuZLofbU',
 'Kneel with forearms on ball. Roll ball forward extending arms, engage core to roll back to start.',
 'Ajoelhe com os antebraços na bola. Role a bola para frente estendendo os braços, contraia o core para rolar de volta ao início.'),

-- Stability Ball Back Extension
('stability_ball_back_ext', 'Stability Ball Back Extension', 'Extensão de Costas na Bola',
 ARRAY['back', 'glutes'], ARRAY['hamstrings', 'core'],
 'stability ball', 'beginner',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/09/stability-ball-back-extension.gif',
 'https://www.youtube.com/watch?v=w0LpVe-tR0Q',
 'Lie face down with hips on ball, feet anchored. Lower torso over ball, raise up squeezing back muscles.',
 'Deite de bruços com os quadris na bola, pés ancorados. Baixe o tronco sobre a bola, levante apertando os músculos das costas.'),

-- Stability Ball Knee Tuck
('stability_ball_knee_tuck', 'Stability Ball Knee Tuck', 'Knee Tuck na Bola',
 ARRAY['core', 'hip flexors'], ARRAY['shoulders'],
 'stability ball', 'intermediate',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/10/stability-ball-knee-tuck.gif',
 'https://www.youtube.com/watch?v=rGaTEJv3T5Q',
 'Start in push-up position with shins on ball. Pull knees to chest rolling ball under you, extend back.',
 'Comece na posição de flexão com as canelas na bola. Puxe os joelhos ao peito rolando a bola para baixo de você, estenda de volta.'),

-- Stability Ball Glute Bridge
('stability_ball_glute_bridge', 'Stability Ball Glute Bridge', 'Ponte de Glúteos na Bola',
 ARRAY['glutes', 'hamstrings'], ARRAY['core'],
 'stability ball', 'beginner',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/10/stability-ball-hip-thrust.gif',
 'https://www.youtube.com/watch?v=9FGg0sU-k-Q',
 'Lie on back with heels on ball. Raise hips until body forms straight line, squeeze glutes at top, lower slowly.',
 'Deite de costas com os calcanhares na bola. Eleve os quadris até o corpo formar uma linha reta, aperte os glúteos no topo, desça lentamente.'),

-- Stability Ball Squat
('stability_ball_wall_squat', 'Stability Ball Wall Squat', 'Agachamento com Bola na Parede',
 ARRAY['quadriceps', 'glutes'], ARRAY['hamstrings', 'core'],
 'stability ball', 'beginner',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/09/wall-ball-squat.gif',
 'https://www.youtube.com/watch?v=I6tQDGYG9BA',
 'Place ball between lower back and wall. Squat down rolling ball with you, drive through heels to stand.',
 'Coloque a bola entre a parte inferior das costas e a parede. Agache rolando a bola consigo, empurre pelos calcanhares para levantar.'),

-- Stability Ball I-Y-T Raise
('stability_ball_iyt', 'Stability Ball I-Y-T Raise', 'Elevação I-Y-T na Bola',
 ARRAY['shoulders', 'back'], ARRAY['trapezius', 'core'],
 'stability ball', 'beginner',
 'https://www.inspireusafoundation.org/wp-content/uploads/2022/09/i-y-t-raises.gif',
 'https://www.youtube.com/watch?v=vwNpnMYLPaI',
 'Lie face down on ball. Raise arms in I shape (straight ahead), then Y shape (45 degrees), then T shape (out to sides).',
 'Deite de bruços na bola. Eleve os braços em forma de I (reto à frente), depois Y (45 graus), depois T (para os lados).')

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

-- Verify insertion
SELECT id, name, equipment FROM exercise_library 
WHERE equipment IN ('bench', 'dumbbell', 'kettlebell', 'stability ball')
ORDER BY equipment, name;
