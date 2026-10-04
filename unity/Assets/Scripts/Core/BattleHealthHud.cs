using System.Collections.Generic;
using SkyStrike.Combat;
using SkyStrike.Targeting;
using UnityEngine;
using UnityEngine.UI;
namespace SkyStrike.Core
{
    // One screen-space canvas, bounded bars; never create canvases or materials per frame.
    [DefaultExecutionOrder(100)]
    public sealed class BattleHealthHud : MonoBehaviour
    {
        sealed class Bar { public Combatant Unit; public RectTransform Root, Fill; public Image Border; }
        readonly List<Bar> bars = new List<Bar>(24);
        RectTransform parent;
        Camera view;
        Canvas canvas;
        Combatant player;
        public void Initialize(RectTransform canvasRoot, Camera camera, Combatant controlled)
        {
            parent = canvasRoot; view = camera; player = controlled; canvas = parent.GetComponentInParent<Canvas>();
            // Inactive prewarmed minions must also receive bars before the first wave.
            foreach (Combatant unit in Object.FindObjectsByType<Combatant>(FindObjectsInactive.Include, FindObjectsSortMode.None))
            {
                if (unit.gameObject.scene != gameObject.scene) continue;
                var root = new GameObject("Health " + unit.name, typeof(RectTransform), typeof(Image));
                RectTransform rect = root.GetComponent<RectTransform>(); rect.SetParent(parent, false);
                rect.sizeDelta = new Vector2(unit.Kind == UnitKind.Minion ? 40 : 84, unit.Kind == UnitKind.Minion ? 5 : 8);
                Image background = root.GetComponent<Image>(); background.color = new Color(.04f,.06f,.08f,.9f); background.raycastTarget = false;
                var fill = new GameObject("Fill", typeof(RectTransform), typeof(Image)); RectTransform fillRect = fill.GetComponent<RectTransform>(); fillRect.SetParent(rect,false);
                fillRect.anchorMin = Vector2.zero; fillRect.anchorMax = Vector2.one; fillRect.offsetMin = Vector2.one; fillRect.offsetMax = -Vector2.one;
                Image image = fill.GetComponent<Image>(); image.color = unit.Team == player.Team ? new Color(.15f,.8f,1) : new Color(1,.25f,.2f); image.raycastTarget = false;
                if (unit.Kind == UnitKind.Hero)
                {
                    var label = new GameObject("Identity", typeof(RectTransform), typeof(Text)); var text = label.GetComponent<Text>();
                    text.rectTransform.SetParent(rect,false); text.rectTransform.anchoredPosition = new Vector2(0,15); text.rectTransform.sizeDelta = new Vector2(140,22);
                    text.text = unit == player ? "YOU" : "ENEMY HERO"; text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"); text.fontSize=14; text.alignment=TextAnchor.MiddleCenter; text.color=image.color; text.raycastTarget=false;
                }
                bars.Add(new Bar { Unit=unit, Root=rect, Fill=fillRect, Border=background });
            }
            // Health bars must not intercept or cover the persistent interaction controls.
            foreach (Bar bar in bars) bar.Root.SetAsFirstSibling();
        }
        void LateUpdate() => RefreshNow();
        public void RefreshNow()
        {
            if (view == null || parent == null) return;
            Combatant selected = player != null ? player.GetComponent<TargetingSystem>().Current : null;
            for (int i=0;i<bars.Count;i++)
            {
                Bar bar=bars[i]; bool visible=bar.Unit != null && bar.Unit.Alive;
                Vector3 screen=visible ? view.WorldToScreenPoint(bar.Unit.HitPoint + Vector3.up * .9f) : Vector3.zero;
                visible &= screen.z>0 && screen.x>=0 && screen.x<=view.pixelWidth && screen.y>=0 && screen.y<=view.pixelHeight;
                if (bar.Root.gameObject.activeSelf!=visible) bar.Root.gameObject.SetActive(visible);
                if (!visible) continue;
                RectTransformUtility.ScreenPointToLocalPointInRectangle(parent,screen,canvas != null && canvas.renderMode != RenderMode.ScreenSpaceOverlay ? canvas.worldCamera : null,out Vector2 local);
                bar.Root.anchoredPosition=local;
                bar.Fill.anchorMax=new Vector2(0,1);
                bar.Fill.offsetMin=Vector2.one;
                bar.Fill.offsetMax=new Vector2(1 + Mathf.Max(0,bar.Root.rect.width-2)*Mathf.Clamp01(bar.Unit.Health/bar.Unit.MaxHealth),-1);
                bar.Border.color=bar.Unit==selected ? Color.yellow : new Color(.04f,.06f,.08f,.9f);
            }
        }
    }
}
