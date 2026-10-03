using SkyStrike.Character;
using SkyStrike.Data;
using SkyStrike.Input;
using UnityEngine;
namespace SkyStrike.UI
{
    public sealed class AbilityIndicator : MonoBehaviour
    {
        public HeroDefinition Hero;
        public SkillButton[] Buttons;
        public Transform CameraTransform;
        LineRenderer line;
        readonly Vector3[] points = new Vector3[34];
        void Start()
        {
            GameObject child = new GameObject("Ability telegraph"); child.transform.SetParent(transform, false);
            line = child.AddComponent<LineRenderer>(); line.useWorldSpace = true; line.widthMultiplier = .09f;
            line.material = new Material(Shader.Find("Universal Render Pipeline/Unlit")); line.enabled = false;
            for (int i = 0; i < Buttons.Length; i++) { Buttons[i].AimChanged += Show; Buttons[i].AimEnded += Hide; }
        }
        void Show(int index, Vector2 aim, bool canceled)
        {
            if (line == null || index < 0 || index >= Hero.abilities.Length) return;
            AbilityDefinition skill = Hero.abilities[index];
            Vector3 origin = transform.position + Vector3.up * .12f;
            Vector3 direction = CharacterMotor.CameraRelative(aim, CameraTransform);
            if (direction.sqrMagnitude < .001f) direction = transform.forward;
            Vector3 end = origin + direction.normalized * skill.range;
            points[0] = origin; points[1] = end;
            for (int i = 0; i < 32; i++)
            { float angle = i / 31f * Mathf.PI * 2; points[i + 2] = end + new Vector3(Mathf.Cos(angle), 0, Mathf.Sin(angle)) * Mathf.Max(.3f, skill.radius); }
            line.positionCount = points.Length; line.SetPositions(points); line.enabled = true;
            Color color = canceled ? Color.red : skill.indicatorColor; line.startColor = line.endColor = color;
        }
        void Hide(int _) { if (line != null) line.enabled = false; }
        void OnDestroy()
        { if (Buttons != null) foreach (SkillButton button in Buttons) if (button != null) { button.AimChanged -= Show; button.AimEnded -= Hide; } }
    }
}
