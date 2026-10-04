using UnityEngine;

namespace SkyStrike.Input
{
    /// <summary>Place directly beneath a full-screen overlay canvas.</summary>
    [RequireComponent(typeof(RectTransform))]
    public sealed class SafeAreaPanel : MonoBehaviour
    {
        Rect lastSafeArea;
        Vector2Int lastScreen;
        void OnEnable() => Refresh();
        void Update() => Refresh();
        void Refresh()
        {
            var screen = new Vector2Int(Screen.width, Screen.height);
            Rect safe = Screen.safeArea;
            if (screen == lastScreen && safe == lastSafeArea) return;
            lastScreen = screen; lastSafeArea = safe;
            Apply((RectTransform)transform, safe, screen);
        }
        public static void Apply(RectTransform panel, Rect safeArea, Vector2Int screen)
        {
            if (panel == null || screen.x <= 0 || screen.y <= 0) return;
            panel.anchorMin = new Vector2(Mathf.Clamp01(safeArea.xMin / screen.x), Mathf.Clamp01(safeArea.yMin / screen.y));
            panel.anchorMax = new Vector2(Mathf.Clamp01(safeArea.xMax / screen.x), Mathf.Clamp01(safeArea.yMax / screen.y));
            panel.offsetMin = panel.offsetMax = Vector2.zero;
        }
    }
}
