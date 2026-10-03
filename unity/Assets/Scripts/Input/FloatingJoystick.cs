using System;
using UnityEngine;
using UnityEngine.EventSystems;

namespace SkyStrike.Input
{
    /// <summary>
    /// Floating joystick on a raycastable UI area. Owns exactly one EventSystem pointer;
    /// other fingers remain available for abilities. Distances are in this RectTransform's units.
    /// </summary>
    [DisallowMultipleComponent]
    [RequireComponent(typeof(RectTransform))]
    public sealed class FloatingJoystick : MonoBehaviour, IPointerDownHandler, IPointerUpHandler,
        IDragHandler, IInitializePotentialDragHandler, IEndDragHandler, ICancelHandler
    {
        [SerializeField] private RectTransform baseVisual;
        [SerializeField] private RectTransform handleVisual;
        [SerializeField, Min(1f)] private float radius = 90f;
        [SerializeField, Range(0f, 0.95f)] private float deadZone = 0.15f;

        private RectTransform area;
        private Camera pressCamera;
        private Vector2 origin;
        private int pointerId;

        public Vector2 Value { get; private set; }
        public bool IsPressed { get; private set; }
        public event Action<Vector2> ValueChanged;

        private void Awake()
        {
            area = (RectTransform)transform;
            SetVisualsVisible(false);
        }

        public void Configure(RectTransform baseVisual, RectTransform handleVisual,
            float radius = 90f, float deadZone = 0.15f)
        {
            ResetInput();
            this.baseVisual = baseVisual;
            this.handleVisual = handleVisual;
            this.radius = Mathf.Max(1f, radius);
            this.deadZone = Mathf.Clamp(deadZone, 0f, 0.95f);
            area = (RectTransform)transform;
            SetVisualsVisible(false);
        }

        public void OnPointerDown(PointerEventData eventData)
        {
            if (!isActiveAndEnabled || IsPressed || eventData.button != PointerEventData.InputButton.Left)
                return;
            if (!RectTransformUtility.ScreenPointToLocalPointInRectangle(
                    area, eventData.position, eventData.pressEventCamera, out origin))
                return;

            pointerId = eventData.pointerId;
            pressCamera = eventData.pressEventCamera;
            IsPressed = true;
            if (baseVisual != null)
                baseVisual.position = area.TransformPoint(origin);
            SetVisualsVisible(true);
            MoveHandle(Vector2.zero);
            SetValue(Vector2.zero);
        }

        public void OnInitializePotentialDrag(PointerEventData eventData)
        {
            // Unity's default drag threshold otherwise swallows the beginning of movement.
            eventData.useDragThreshold = false;
        }

        public void OnDrag(PointerEventData eventData)
        {
            if (!Owns(eventData))
                return;
            if (TouchInputSetup.IsCanceledTouch(eventData))
            {
                ResetInput();
                return;
            }
            if (!RectTransformUtility.ScreenPointToLocalPointInRectangle(
                    area, eventData.position, pressCamera, out Vector2 point))
                return;

            Vector2 normalized = Vector2.ClampMagnitude((point - origin) / radius, 1f);
            MoveHandle(normalized * radius);
            SetValue(ApplyRadialDeadZone(normalized, deadZone));
        }

        public void OnPointerUp(PointerEventData eventData)
        {
            if (Owns(eventData))
                ResetInput();
        }

        public void OnEndDrag(PointerEventData eventData)
        {
            if (Owns(eventData))
                ResetInput();
        }

        public void OnCancel(BaseEventData eventData) => ResetInput();
        private void OnDisable() => ResetInput();
        private void OnApplicationFocus(bool hasFocus) { if (!hasFocus) ResetInput(); }
        private void OnApplicationPause(bool paused) { if (paused) ResetInput(); }

        /// <summary>Clears capture and reports zero immediately; safe to call repeatedly.</summary>
        public void ResetInput()
        {
            IsPressed = false;
            pointerId = 0;
            pressCamera = null;
            if (area != null)
                MoveHandle(Vector2.zero);
            SetVisualsVisible(false);
            SetValue(Vector2.zero);
        }

        /// <summary>Radial dead zone with the remaining magnitude remapped continuously to 0..1.</summary>
        public static Vector2 ApplyRadialDeadZone(Vector2 value, float deadZone)
        {
            float magnitude = value.magnitude;
            deadZone = Mathf.Clamp(deadZone, 0f, 0.95f);
            if (magnitude <= deadZone || magnitude <= Mathf.Epsilon)
                return Vector2.zero;
            float remappedMagnitude = (Mathf.Min(magnitude, 1f) - deadZone) / (1f - deadZone);
            return value * (remappedMagnitude / magnitude);
        }

        private bool Owns(PointerEventData eventData) => IsPressed && eventData.pointerId == pointerId &&
            eventData.button == PointerEventData.InputButton.Left;

        private void SetValue(Vector2 value)
        {
            // Vector2.operator== is approximate and can swallow an exact stop near the dead-zone edge.
            if (Value.Equals(value))
                return;
            Value = value;
            ValueChanged?.Invoke(value);
        }

        private void MoveHandle(Vector2 offset)
        {
            if (handleVisual != null)
                handleVisual.position = area.TransformPoint(origin + offset);
        }

        private void SetVisualsVisible(bool visible)
        {
            // The input area must remain active even when its visual is hidden.
            if (baseVisual != null && baseVisual != transform)
                baseVisual.gameObject.SetActive(visible);
        }
    }
}
