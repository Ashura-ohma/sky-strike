using SkyStrike.Character;
using SkyStrike.Combat;
using SkyStrike.Data;
using SkyStrike.Input;
using UnityEngine;
namespace SkyStrike.UI
{
    public sealed class AbilityIndicator : MonoBehaviour
    {
        public HeroDefinition Hero;
        public Material IndicatorMaterial;
        public SkillButton[] Buttons;
        public Transform CameraTransform;
        LineRenderer line;
        readonly Vector3[] points = new Vector3[34];
        int activeIndex = -1;
        Vector2 activeAim;
        bool activeCanceled;
        Combatant owner;
        void Start()
        {
            owner = GetComponent<Combatant>();
            GameObject child = new GameObject("Ability telegraph"); child.transform.SetParent(transform, false);
            line = child.AddComponent<LineRenderer>(); line.useWorldSpace = true; line.widthMultiplier = .09f;
            line.sharedMaterial = IndicatorMaterial; line.enabled = false;
            if (Buttons != null) foreach (SkillButton button in Buttons)
                if (button != null) { button.AimChanged += Show; button.AimEnded += Hide; }
        }
        void Show(int index, Vector2 aim, bool canceled)
        {
            activeIndex = index; activeAim = aim; activeCanceled = canceled;
            Draw();
        }
        // Finger motion is not required to refresh a world-space telegraph: the owner
        // can move, turn, dash, or respawn while the UI aim vector is unchanged.
        void LateUpdate() => Draw();
        void Draw()
        {
            if (line == null) return;
            if (!isActiveAndEnabled || activeIndex < 0 || Hero == null || activeIndex >= Hero.abilities.Length ||
                CameraTransform == null || (owner != null && !owner.Alive) || Time.timeScale <= 0)
            { line.enabled = false; return; }
            AbilityDefinition skill = Hero.abilities[activeIndex];
            if (skill == null) { line.enabled = false; return; }
            Vector3 origin = transform.position + Vector3.up * .12f;
            Vector3 direction = CharacterMotor.CameraRelative(activeAim, CameraTransform);
            float strength = direction.magnitude;
            if (direction.sqrMagnitude < .001f) direction = transform.forward;
            float distance = skill.type == AbilityType.Self || skill.type == AbilityType.AOE ? 0 :
                skill.range * (skill.type == AbilityType.TargetPoint ? strength : 1);
            Vector3 end = origin + direction.normalized * distance;
            points[0] = origin; points[1] = end;
            for (int i = 0; i < 32; i++)
            { float angle = i / 31f * Mathf.PI * 2; points[i + 2] = end + new Vector3(Mathf.Cos(angle), 0, Mathf.Sin(angle)) * Mathf.Max(.3f, skill.radius); }
            line.positionCount = points.Length; line.SetPositions(points); line.enabled = true;
            Color color = activeCanceled ? Color.red : skill.indicatorColor; line.startColor = line.endColor = color;
        }
        void Hide(int index)
        {
            if (activeIndex != index) return;
            activeIndex = -1;
            // Ending a different finger's gesture must not hide the surviving aim.
            if (Buttons != null) foreach (SkillButton button in Buttons)
                if (button != null && button.IsPressed && button.IsAiming && button.AbilityId != index)
                { activeIndex = button.AbilityId; activeAim = button.Aim; activeCanceled = button.IsOverCancelZone; }
            Draw();
        }
        void OnDisable() { activeIndex = -1; if (line != null) line.enabled = false; }
        void OnDestroy()
        { if (Buttons != null) foreach (SkillButton button in Buttons) if (button != null) { button.AimChanged -= Show; button.AimEnded -= Hide; } }
    }
}
