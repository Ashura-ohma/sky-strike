#!/usr/bin/env python3
"""Compile against installed Unity DLLs, WITHOUT claiming Unity import/build or test execution.
Usage: python3 Tools/reference_compile.py /path/to/Unity/Editor/Data
The official URP template DLL cache may contain package versions different from manifest.
"""
import pathlib, subprocess, sys, tempfile
root = pathlib.Path(__file__).resolve().parents[1]
data = pathlib.Path(sys.argv[1])
templates = list((data / 'Resources/PackageManager/ProjectTemplates/libcache').glob('com.unity.template.3d-cross-platform-*/ScriptAssemblies'))
if not templates: raise SystemExit('Official URP template reference assemblies missing')
refs = list((data/'UnityReferenceAssemblies/unity-4.8-api').glob('*.dll')) + list((data/'UnityReferenceAssemblies/unity-4.8-api/Facades').glob('*.dll')) + list((data/'Managed/UnityEngine').glob('*.dll')) + [p for p in templates[0].glob('*.dll') if not p.name.startswith('Assembly-CSharp')]
with tempfile.TemporaryDirectory() as temp:
    temp = pathlib.Path(temp)
    for name, directory, extra in [('Runtime','Scripts',[]),('Editor','Editor',[temp/'SkyStrike.Runtime.dll'])]:
        sources = list((root/'Assets'/directory).rglob('*.cs'))
        rsp = temp/(name+'.rsp')
        rsp.write_text('-nostdlib+\n-target:library\n-out:'+str(temp/('SkyStrike.'+name+'.dll'))+'\n'+'\n'.join('-r:'+str(r) for r in refs+extra)+'\n'+'\n'.join(map(str,sources)))
        result = subprocess.run([str(data/'NetCoreRuntime/dotnet'), str(data/'DotNetSdkRoslyn/csc.dll'), '@'+str(rsp)], capture_output=True, text=True)
        print(name+': '+result.stdout+result.stderr)
        if result.returncode: raise SystemExit(result.returncode)
print('PASS: C# reference compilation only. Unity import, EditMode/PlayMode execution and APK build NOT performed.')
