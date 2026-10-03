import numpy as np,wave
from pathlib import Path
sr=32000;duration=48;n=sr*duration;out=np.zeros(n,dtype=np.float64);tempo=.5
# Original 24-bar loop: layered sustained chords, bell arpeggio and soft percussion.
chords=[[50,57,62,65],[46,53,58,62],[48,55,60,64],[45,52,57,60]]
def note(midi,start,dur,amp,kind='pad'):
    offset=int(start*sr);length=min(int(dur*sr),n-offset)
    if length<=0:return
    t=np.arange(length)/sr;freq=440*2**((midi-69)/12)
    if kind=='pad':
        sig=sum(np.sin(2*np.pi*freq*(1+d)*t)/(i+1) for i,d in enumerate([0,.002,-.002]))/2;env=np.minimum(t/.4,1)*np.minimum((dur-t)/.8,1)
    else:sig=np.sin(2*np.pi*freq*t)+.23*np.sin(2*np.pi*freq*2*t);env=(1-np.exp(-t*90))*np.exp(-t*2.5)
    out[offset:offset+length]+=sig*env*amp
for bar in range(24):
    chord=chords[(bar//2)%4]
    for midi in chord:note(midi,bar*2,2.5,.045)
    note(chord[0]-12,bar*2,1.5,.08,'bell')
    for step in range(4):note(chord[(step+bar)%4]+12,bar*2+step*.5,.9,.055 if step%2==0 else .035,'bell')
    for beat in [0,1]:
        start=int((bar*2+beat)*sr);t=np.arange(int(.17*sr))/sr;kick=np.sin(2*np.pi*(65*t-90*t*t))*np.exp(-t*26)*.07;out[start:start+len(kick)]+=kick
# Gentle stereo echo without introducing a hard loop boundary.
left=out+np.roll(out,int(.375*sr))*.15;right=out+np.roll(out,int(.625*sr))*.15
signal=np.stack([left,right],axis=1);signal=np.tanh(signal*1.25)*.7
with wave.open('/tmp/zhufeng-v3-theme.wav','wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(sr);f.writeframes((signal*32767).astype('<i2').tobytes())

# Encode the local composition into the shipped, offline audio resource.
import subprocess
subprocess.run(["ffmpeg","-y","-loglevel","error","-i","/tmp/zhufeng-v3-theme.wav","-c:a","libvorbis","-q:a","5","android/app/src/main/assets/audio/theme.ogg"],check=True)
