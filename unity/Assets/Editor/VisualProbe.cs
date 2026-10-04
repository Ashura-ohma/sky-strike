using System;
using System.IO;
using SkyStrike.Core;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.UI;
namespace SkyStrike.Editor
{
    // Run only as a separate -batchmode graphics-enabled probe, never as a full editor preview.
    // The default -nographics test/build path remains independent of this optional check.
    public static class VisualProbe
    {
        static double deadline, readyAt;
        static bool capturing;
        public static void Run()
        {
            if (SystemInfo.graphicsDeviceType == GraphicsDeviceType.Null)
                throw new InvalidOperationException("Visual probe requires a supported graphics device; omit -nographics.");
            EditorSceneManager.OpenScene("Assets/Scenes/Battle/Battle.unity");
            deadline = EditorApplication.timeSinceStartup + 90;
            readyAt = 0; capturing = false;
            EditorApplication.update += Tick;
            EditorApplication.isPlaying = true;
        }
        static void Tick()
        {
            if (EditorApplication.timeSinceStartup > deadline) { Finish(2); return; }
            if (!EditorApplication.isPlaying || capturing) return;
            BattleRuntime battle = UnityEngine.Object.FindFirstObjectByType<BattleRuntime>();
            if (battle == null || battle.Camera.Target == null) return;
            if (readyAt == 0) { readyAt = EditorApplication.timeSinceStartup + 2; return; }
            if (EditorApplication.timeSinceStartup < readyAt) return;
            capturing = true;
            try
            {
                Camera camera = battle.Camera.GetComponent<Camera>();
                Capture(camera,1280,720,"alpha3-battle-16x9.png");
                Capture(camera,1600,720,"alpha3-battle-wide.png");
                Debug.Log("VISUAL_PROBE_COMPLETE"); Finish(0);
            }
            catch(Exception e) { Debug.LogException(e); Finish(1); }
        }
        static void Capture(Camera camera,int width,int height,string filename)
        {
            RenderTexture target = new RenderTexture(width,height,24,RenderTextureFormat.ARGB32);
            RenderTexture previous = RenderTexture.active;
            camera.targetTexture=target; camera.aspect=(float)width/height;
            foreach(Canvas canvas in UnityEngine.Object.FindObjectsByType<Canvas>(FindObjectsSortMode.None))
            { canvas.renderMode=RenderMode.ScreenSpaceCamera;canvas.worldCamera=camera;canvas.planeDistance=.5f; }
            Canvas.ForceUpdateCanvases();
            UnityEngine.Object.FindFirstObjectByType<BattleHealthHud>()?.RefreshNow();
            var request=new UniversalRenderPipeline.SingleCameraRequest { destination=target };
            if(!RenderPipeline.SupportsRenderRequest(camera,request)) throw new InvalidOperationException("URP render request unsupported");
            RenderPipeline.SubmitRenderRequest(camera,request);
            RenderTexture.active=target;
            Texture2D pixels=new Texture2D(width,height,TextureFormat.RGB24,false);
            pixels.ReadPixels(new Rect(0,0,width,height),0,0);pixels.Apply();
            Directory.CreateDirectory("Validation");File.WriteAllBytes("Validation/"+filename,pixels.EncodeToPNG());
            UnityEngine.Object.DestroyImmediate(pixels);RenderTexture.active=previous;camera.targetTexture=null;target.Release();UnityEngine.Object.DestroyImmediate(target);
        }
        static void Finish(int code)
        {
            EditorApplication.update-=Tick;
            EditorApplication.Exit(code);
        }
    }
}
