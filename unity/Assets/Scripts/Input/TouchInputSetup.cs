using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.UI;

namespace SkyStrike.Input
{
    /// <summary>One-time uGUI setup. Requires the Input System package and Active Input Handling = Input System.</summary>
    public static class TouchInputSetup
    {
        public static EventSystem EnsureEventSystem()
        {
            var eventSystem = EventSystem.current;
            if (eventSystem == null)
                eventSystem = Object.FindFirstObjectByType<EventSystem>();
            if (eventSystem == null)
                eventSystem = new GameObject("EventSystem", typeof(EventSystem)).GetComponent<EventSystem>();

            // Disable competing modules. Do not run the legacy module alongside the new one.
            var modules = eventSystem.GetComponents<BaseInputModule>();
            for (int i = 0; i < modules.Length; i++)
                if (!(modules[i] is InputSystemUIInputModule))
                    modules[i].enabled = false;

            var module = eventSystem.GetComponent<InputSystemUIInputModule>();
            if (module == null)
                module = eventSystem.gameObject.AddComponent<InputSystemUIInputModule>();
            if (module.point == null || module.leftClick == null)
                module.AssignDefaultActions();
            module.pointerBehavior = UIPointerBehavior.AllPointersAsIs;
            module.enabled = true;
            eventSystem.sendNavigationEvents = false;
            return eventSystem;
        }

        internal static bool IsCanceledTouch(PointerEventData eventData)
        {
            if (!(eventData is ExtendedPointerEventData extended) ||
                !(extended.device is Touchscreen touchscreen) || extended.touchId == 0)
                return false;

            var touches = touchscreen.touches;
            for (int i = 0; i < touches.Count; i++)
            {
                var touch = touches[i];
                if (touch.touchId.ReadValue() == extended.touchId)
                    return touch.phase.ReadValue() == UnityEngine.InputSystem.TouchPhase.Canceled;
            }
            return false;
        }
    }
}
