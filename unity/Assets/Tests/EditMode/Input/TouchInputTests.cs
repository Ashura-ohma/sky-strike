using System.Collections.Generic;
using System.Reflection;
using NUnit.Framework;
using SkyStrike.Input;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;

namespace SkyStrike.Tests.Input
{
    // Run with Unity 6 Test Runner, EditMode. These cannot run in a plain .NET test process.
    public sealed class TouchInputTests
    {
        private readonly List<GameObject> objects = new List<GameObject>();
        private EventSystem eventSystem;

        [SetUp]
        public void SetUp()
        {
            eventSystem = NewObject("Test EventSystem").AddComponent<EventSystem>();
        }

        [TearDown]
        public void TearDown()
        {
            for (int i = objects.Count - 1; i >= 0; i--)
                if (objects[i] != null)
                    Object.DestroyImmediate(objects[i]);
            objects.Clear();
        }

        [Test]
        public void RadialDeadZone_IsZeroInsideAndContinuousAtEdge()
        {
            Assert.That(FloatingJoystick.ApplyRadialDeadZone(Vector2.zero, 0.2f), Is.EqualTo(Vector2.zero));
            Assert.That(FloatingJoystick.ApplyRadialDeadZone(new Vector2(0.2f, 0f), 0.2f), Is.EqualTo(Vector2.zero));
            Vector2 result = FloatingJoystick.ApplyRadialDeadZone(new Vector2(0.6f, 0f), 0.2f);
            Assert.That(result.x, Is.EqualTo(0.5f).Within(0.0001f));
            Assert.That(result.y, Is.Zero);
        }

        [Test]
        public void RadialDeadZone_DiagonalNeverExceedsUnitLength()
        {
            Vector2 result = FloatingJoystick.ApplyRadialDeadZone(new Vector2(2f, 2f), 0.15f);
            Assert.That(result.magnitude, Is.EqualTo(1f).Within(0.0001f));
            Assert.That(result.x, Is.EqualTo(result.y).Within(0.0001f));
        }

        [Test]
        public void Joystick_UsesFloatingOriginAndRemappedMagnitude()
        {
            FloatingJoystick joystick = NewJoystick();
            joystick.OnPointerDown(Pointer(17, 300f, 200f));
            joystick.OnDrag(Pointer(17, 360f, 200f));
            Assert.That(joystick.Value.x, Is.EqualTo(0.5f).Within(0.0001f));
            Assert.That(joystick.Value.y, Is.Zero);
        }

        [Test]
        public void Joystick_ReleaseStopsImmediatelyAndCannotBeStolenBySecondFinger()
        {
            FloatingJoystick joystick = NewJoystick();
            Vector2 reported = Vector2.one;
            joystick.ValueChanged += value => reported = value;
            joystick.OnPointerDown(Pointer(17, 0f, 0f));
            joystick.OnDrag(Pointer(17, 100f, 0f));
            joystick.OnPointerDown(Pointer(18, 100f, 100f));
            joystick.OnDrag(Pointer(18, 100f, 0f));
            joystick.OnPointerUp(Pointer(18, 100f, 0f));
            Assert.That(joystick.IsPressed, Is.True);
            Assert.That(joystick.Value, Is.EqualTo(Vector2.right));

            joystick.OnPointerUp(Pointer(17, 100f, 0f));
            Assert.That(joystick.Value, Is.EqualTo(Vector2.zero));
            Assert.That(reported, Is.EqualTo(Vector2.zero));
            Assert.That(joystick.IsPressed, Is.False);
            joystick.OnDrag(Pointer(17, 100f, 0f));
            Assert.That(joystick.Value, Is.EqualTo(Vector2.zero));
        }

        [Test]
        public void Joystick_FocusLossAndPauseClearPointerCapture()
        {
            FloatingJoystick joystick = NewJoystick();
            joystick.OnPointerDown(Pointer(17, 0f, 0f));
            joystick.OnDrag(Pointer(17, 100f, 0f));
            InvokeLifecycleCallback(joystick, "OnApplicationFocus", false);
            Assert.That(joystick.Value, Is.EqualTo(Vector2.zero));
            Assert.That(joystick.IsPressed, Is.False);

            joystick.OnPointerDown(Pointer(18, 0f, 0f));
            joystick.OnDrag(Pointer(18, 100f, 0f));
            InvokeLifecycleCallback(joystick, "OnApplicationPause", true);
            Assert.That(joystick.Value, Is.EqualTo(Vector2.zero));
            Assert.That(joystick.IsPressed, Is.False);
        }

        [Test]
        public void Joystick_ReleaseReportsExactZeroEvenAtDeadZoneBoundary()
        {
            FloatingJoystick joystick = NewJoystick();
            Vector2 reported = Vector2.one;
            joystick.ValueChanged += value => reported = value;
            joystick.OnPointerDown(Pointer(17, 0f, 0f));
            joystick.OnDrag(Pointer(17, 100f, 0f));
            joystick.OnDrag(Pointer(17, 20.0001f, 0f));
            Assert.That(joystick.Value.x, Is.GreaterThan(0f));
            Assert.That(joystick.Value.x, Is.LessThan(0.00001f));
            joystick.OnPointerUp(Pointer(17, 20.0001f, 0f));
            Assert.That(joystick.Value.x, Is.Zero);
            Assert.That(joystick.Value.y, Is.Zero);
            Assert.That(reported.x, Is.Zero);
            Assert.That(reported.y, Is.Zero);
        }

        [Test]
        public void Skill_TapSmartcastsExactlyOnceOnRelease()
        {
            SkillButton button = NewSkill();
            int casts = 0;
            SkillCastRequest cast = default;
            button.CastRequested += request => { casts++; cast = request; };
            button.OnPointerDown(Pointer(22, 200f, 100f));
            Assert.That(casts, Is.Zero);
            button.OnPointerUp(Pointer(22, 204f, 100f));
            button.OnPointerUp(Pointer(22, 204f, 100f));
            Assert.That(casts, Is.EqualTo(1));
            Assert.That(cast.AbilityId, Is.EqualTo(3));
            Assert.That(cast.IsSmartCast, Is.True);
            Assert.That(cast.Aim, Is.EqualTo(Vector2.zero));
        }

        [Test]
        public void Skill_DragModeIsStickyAfterReturningToOrigin()
        {
            SkillButton button = NewSkill();
            SkillCastRequest cast = default;
            int casts = 0;
            button.CastRequested += request => { casts++; cast = request; };
            button.OnPointerDown(Pointer(22, 200f, 100f));
            button.OnDrag(Pointer(22, 250f, 100f));
            Assert.That(button.IsAiming, Is.True);
            Assert.That(button.Aim.x, Is.EqualTo(0.5f).Within(0.0001f));
            button.OnDrag(Pointer(22, 200f, 100f));
            button.OnPointerUp(Pointer(22, 200f, 100f));
            Assert.That(casts, Is.EqualTo(1));
            Assert.That(cast.IsSmartCast, Is.False);
            Assert.That(cast.Aim, Is.EqualTo(Vector2.zero));
        }

        [Test]
        public void Skill_HoldWithoutMotionEntersManualAim()
        {
            SkillButton button = NewSkill();
            button.Configure(3, holdSeconds: 0f);
            int aimEvents = 0;
            SkillCastRequest cast = default;
            button.AimChanged += (id, aim, cancel) => aimEvents++;
            button.CastRequested += request => cast = request;
            button.OnPointerDown(Pointer(22, 200f, 100f));
            InvokeLifecycleCallback(button, "Update");
            Assert.That(button.IsAiming, Is.True);
            Assert.That(aimEvents, Is.EqualTo(1));
            button.OnPointerUp(Pointer(22, 200f, 100f));
            Assert.That(cast.IsSmartCast, Is.False);
        }

        [Test]
        public void Skill_ReleaseUsesFinalPositionEvenWithoutDragCallback()
        {
            SkillButton button = NewSkill();
            SkillCastRequest cast = default;
            button.CastRequested += request => cast = request;
            button.OnPointerDown(Pointer(22, 200f, 100f));
            button.OnPointerUp(Pointer(22, 350f, 100f));
            Assert.That(cast.IsSmartCast, Is.False);
            Assert.That(cast.Aim, Is.EqualTo(Vector2.right));
        }

        [Test]
        public void Skill_ReleaseOverCancelZoneNeverCasts()
        {
            RectTransform zone = NewRect("Cancel zone", new Vector2(350f, 100f), new Vector2(60f, 60f));
            SkillButton button = NewSkill(zone);
            int casts = 0;
            int endings = 0;
            button.CastRequested += request => casts++;
            button.AimEnded += id => endings++;
            button.OnPointerDown(Pointer(22, 200f, 100f));
            button.OnDrag(Pointer(22, 350f, 100f));
            Assert.That(button.IsOverCancelZone, Is.True);
            button.OnPointerUp(Pointer(22, 350f, 100f));
            Assert.That(casts, Is.Zero);
            Assert.That(endings, Is.EqualTo(1));
            Assert.That(button.IsPressed, Is.False);
        }

        [Test]
        public void Skill_LeavingCancelZoneRearmsTheSameManualGesture()
        {
            RectTransform zone = NewRect("Cancel zone", new Vector2(350f, 100f), new Vector2(60f, 60f));
            SkillButton button = NewSkill(zone);
            int casts = 0;
            button.CastRequested += request => casts++;
            button.OnPointerDown(Pointer(22, 200f, 100f));
            button.OnDrag(Pointer(22, 350f, 100f));
            button.OnDrag(Pointer(22, 280f, 100f));
            Assert.That(button.IsOverCancelZone, Is.False);
            button.OnPointerUp(Pointer(22, 280f, 100f));
            Assert.That(casts, Is.EqualTo(1));
        }

        [Test]
        public void Skill_WrongPointerCannotReleaseOrRedirectCapturedGesture()
        {
            SkillButton button = NewSkill();
            int casts = 0;
            button.CastRequested += request => casts++;
            button.OnPointerDown(Pointer(22, 200f, 100f));
            button.OnDrag(Pointer(23, 350f, 100f));
            button.OnPointerUp(Pointer(23, 350f, 100f));
            Assert.That(button.IsPressed, Is.True);
            Assert.That(button.IsAiming, Is.False);
            Assert.That(casts, Is.Zero);
            button.OnPointerUp(Pointer(22, 200f, 100f));
            Assert.That(casts, Is.EqualTo(1));
        }

        [Test]
        public void MovementAndAbilityHaveIndependentPointerOwnership()
        {
            FloatingJoystick joystick = NewJoystick();
            SkillButton button = NewSkill();
            int casts = 0;
            button.CastRequested += request => casts++;
            joystick.OnPointerDown(Pointer(11, 0f, 0f));
            joystick.OnDrag(Pointer(11, 100f, 0f));
            button.OnPointerDown(Pointer(22, 200f, 100f));
            button.OnDrag(Pointer(22, 300f, 100f));
            button.OnPointerUp(Pointer(22, 300f, 100f));
            Assert.That(casts, Is.EqualTo(1));
            Assert.That(joystick.IsPressed, Is.True);
            Assert.That(joystick.Value, Is.EqualTo(Vector2.right));
            joystick.OnPointerUp(Pointer(11, 100f, 0f));
            Assert.That(joystick.Value, Is.EqualTo(Vector2.zero));
        }

        [Test]
        public void Skill_FocusLossPauseAndExplicitResetDoNotCast()
        {
            SkillButton button = NewSkill();
            int casts = 0;
            int endings = 0;
            button.CastRequested += request => casts++;
            button.AimEnded += id => endings++;
            button.OnPointerDown(Pointer(22, 200f, 100f));
            InvokeLifecycleCallback(button, "OnApplicationFocus", false);
            button.OnPointerUp(Pointer(22, 200f, 100f));
            button.OnPointerDown(Pointer(23, 200f, 100f));
            InvokeLifecycleCallback(button, "OnApplicationPause", true);
            button.OnPointerDown(Pointer(24, 200f, 100f));
            button.ResetInput();
            button.ResetInput();
            Assert.That(casts, Is.Zero);
            Assert.That(endings, Is.EqualTo(3));
            Assert.That(button.IsPressed, Is.False);
        }

        [Test]
        public void Skill_InterruptedDragDoesNotCast()
        {
            SkillButton button = NewSkill();
            int casts = 0;
            button.CastRequested += request => casts++;
            button.OnPointerDown(Pointer(22, 200f, 100f));
            button.OnDrag(Pointer(22, 300f, 100f));
            button.OnEndDrag(Pointer(22, 300f, 100f));
            button.OnPointerUp(Pointer(22, 300f, 100f));
            Assert.That(casts, Is.Zero);
            Assert.That(button.IsPressed, Is.False);
        }

        [Test]
        public void RightMouseReleaseDoesNotEndLeftMouseGestures()
        {
            FloatingJoystick joystick = NewJoystick();
            SkillButton button = NewSkill();
            joystick.OnPointerDown(Pointer(11, 0f, 0f));
            button.OnPointerDown(Pointer(22, 200f, 100f));
            PointerEventData joystickRight = Pointer(11, 0f, 0f);
            joystickRight.button = PointerEventData.InputButton.Right;
            PointerEventData skillRight = Pointer(22, 200f, 100f);
            skillRight.button = PointerEventData.InputButton.Right;
            joystick.OnPointerUp(joystickRight);
            button.OnPointerUp(skillRight);
            Assert.That(joystick.IsPressed, Is.True);
            Assert.That(button.IsPressed, Is.True);
        }

        [Test]
        public void EventSystemSetup_UsesIndependentNewInputSystemPointersAndIsIdempotent()
        {
            EventSystem first = TouchInputSetup.EnsureEventSystem();
            EventSystem second = TouchInputSetup.EnsureEventSystem();
            Assert.That(second, Is.SameAs(first));
            var modules = first.GetComponents<InputSystemUIInputModule>();
            Assert.That(modules.Length, Is.EqualTo(1));
            Assert.That(modules[0].pointerBehavior, Is.EqualTo(UIPointerBehavior.AllPointersAsIs));
            Assert.That(modules[0].point, Is.Not.Null);
            Assert.That(modules[0].leftClick, Is.Not.Null);
            Assert.That(first.sendNavigationEvents, Is.False);
        }

        private static void InvokeLifecycleCallback(MonoBehaviour target, string methodName,
            params object[] arguments)
        {
            // Exercise the managed callback body only. SendMessage routes through Unity's native
            // behaviour dispatcher, which asserts ShouldRunBehaviour for these EditMode objects.
            // Actual OS focus/pause delivery belongs in PlayMode/device integration coverage.
            MethodInfo callback = target.GetType().GetMethod(methodName,
                BindingFlags.Instance | BindingFlags.NonPublic);
            Assert.That(callback, Is.Not.Null, $"Missing lifecycle callback {methodName}");
            callback.Invoke(target, arguments);
        }

        private FloatingJoystick NewJoystick()
        {
            RectTransform rect = NewRect("Joystick input area", Vector2.zero, new Vector2(600f, 400f));
            var joystick = rect.gameObject.AddComponent<FloatingJoystick>();
            joystick.Configure(null, null, 100f, 0.2f);
            return joystick;
        }

        private SkillButton NewSkill(RectTransform cancel = null)
        {
            RectTransform rect = NewRect("Skill", new Vector2(200f, 100f), new Vector2(80f, 80f));
            var skill = rect.gameObject.AddComponent<SkillButton>();
            // Long hold delay makes non-hold tests independent of test runner speed.
            skill.Configure(3, cancel, 100f, 1000f, 14f);
            return skill;
        }

        private PointerEventData Pointer(int id, float x, float y)
        {
            return new PointerEventData(eventSystem)
            {
                pointerId = id,
                position = new Vector2(x, y),
                button = PointerEventData.InputButton.Left
            };
        }

        private RectTransform NewRect(string name, Vector2 position, Vector2 size)
        {
            var rect = NewObject(name, typeof(RectTransform)).GetComponent<RectTransform>();
            rect.position = position;
            rect.sizeDelta = size;
            return rect;
        }

        private GameObject NewObject(string name, params System.Type[] components)
        {
            var gameObject = new GameObject(name, components);
            objects.Add(gameObject);
            return gameObject;
        }
    }
}
