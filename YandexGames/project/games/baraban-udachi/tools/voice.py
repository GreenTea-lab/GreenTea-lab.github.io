# Озвучка фраз ведущего: нейросетевой голос Piper ru_RU «denis» (MIT, датасет CC0), движок sherpa-onnx.
# Запуск: node tools/lines-json.mjs > /tmp/lines.json && python3 tools/voice.py /tmp/lines.json <папка_модели>
# Результат: src/voice-data.js (MP3 в base64, по ключу фразы и номеру варианта).
import sys, json, base64, subprocess, tempfile, os
import sherpa_onnx, soundfile as sf
lines = json.load(open(sys.argv[1]))
d = sys.argv[2]
name = [f for f in os.listdir(d) if f.endswith('.onnx')][0]
tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
    vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=f'{d}/{name}', tokens=f'{d}/tokens.txt', data_dir=f'{d}/espeak-ng-data',
        noise_scale=0.6, noise_scale_w=0.75, length_scale=1.0), num_threads=4)))
SPEED = float(os.environ.get('SPEED', '1.0'))
# лёгкая «студийная» обработка: тёплый низ, компрессия, короткое отражение зала
AF = os.environ.get('AF') or 'highpass=f=70,equalizer=f=160:t=q:w=1:g=3,equalizer=f=3200:t=q:w=1.2:g=2,acompressor=threshold=-18dB:ratio=3:attack=5:release=80,aecho=0.85:0.5:38:0.12,loudnorm=I=-16:TP=-1.5:LRA=7'
out = {}
tmp = tempfile.mkdtemp()
for key, variants in lines.items():
    out[key] = []
    for i, v in enumerate(variants):
        text = v[1] if isinstance(v, list) else v
        text = text.replace('«', '').replace('»', '')
        a = tts.generate(text, sid=0, speed=SPEED)
        w = f'{tmp}/{key}_{i}.wav'; m = f'{tmp}/{key}_{i}.mp3'
        sf.write(w, a.samples, a.sample_rate)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', w, '-af', AF, '-ar', '22050', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '40k', m], check=True)
        out[key].append(base64.b64encode(open(m, 'rb').read()).decode())
        print(key, i, os.path.getsize(m), flush=True)
js = '// Сгенерировано tools/voice.py — не править руками.\nexport const VOICE = ' + json.dumps(out) + ';\n'
open(os.environ.get('OUT') or os.path.join(os.path.dirname(__file__), '..', 'src', 'voice-data.js'), 'w').write(js)
print('total KB', len(js) // 1024)
