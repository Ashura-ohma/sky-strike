using System;
using UnityEngine;
using UnityEngine.EventSystems;

namespace SkyStrike.Input
{
    public readonly struct SkillCastRequest
    {
        public int AbilityId { get; }
        /// <summary>UI-plane direction and strength, length 0..1. Convert to the game's world plane.</summary>
        public Vector2 Aim { get; }
        /// <summary>True for a short tap. The gameplay layer should select a target for this cast.</summary>
        public bool IsSmartCast { get; }

        public SkillCastRequest(int abilityId, Vector2 aim, bool isSmartCast)
        {
            AbilityId = abilityId;
            Aim = aim;
            IsSmartCast = isSmartCast;
        }
    }

    /// <summary>
    /// Tap to smartcast; hold or drag to aim; release to cast or release over the cancel zone to cancel.
    /// Once aiming starts, returning to the button never turns the gesture back into a tap.
    /// </summary>
    [DisallowMultipleComponent]
    [RequireComponent(typeof(RectTransform))]
    public sealed class SkillButton : MonoBehaviour, IPointerDownHandler, IPointerUpHandler,
        IDragHandler, IInitializePotentialDragHandler, IEndDragHandler, ICancelHandler
    {
        [SerializeField] private int abilityId;
        [SerializeField] private RectTransform cancelZone;
        [SerializeField, Min(1f)] private float aimRadius = 100f;
        [SerializeField, Min(0f)] private float holdSeconds = 0.18f;
        [SerializeField, Min(0f)] private float dragThreshold = 14f;

        private RectTransform inputRect;
        private Camera pressCamera;
        private Vector2 pressPoint;
        private Vector2 lastScreenPosition;
        private double pressTime;
        private int pointerId;

        public int AbilityId => abilityId;
        public bool IsPressed { get; private set; }
        public bool IsAiming { get; private set; }
        public bool IsOverCancelZone { get; private set; }
        public Vector2 Aim { get; private set; }
        public event Action<SkillCastRequest> CastRequested;
        public event Action<int, Vector2, bool> AimChanged;
        /// <summary>Emitted once when an active gesture ends, including taps and interruption.</summary>
        public event Action<int> AimEnded;

        private void Awake() => inputRect = (RectTransform)transform;

        public void Configure(int abilityId, RectTransform cancelZone = null,
            float aimRadius = 100f, float holdSeconds = 0.18f, float dragThreshold = 14f)
        {
            ResetInput();
            this.abilityId = abilityId;
            this.cancelZone = cancelZone;
            this.aimRadius = Mathf.Max(1f, aimRadius);
            this.holdSeconds = Mathf.Max(0f, holdSeconds);
            this.dragThreshold = Mathf.Max(0f, dragThreshold);
            inputRect = (RectTransform)transform;
        }

        public void OnPointerDown(PointerEventData eventData)
        {
            if (!isActiveAndEnabled || IsPressed || eventData.button != PointerEventData.InputButton.Left)
                return;
            if (!RectTransformUtility.ScreenPointToLocalPointInRectangle(
                    inputRect, eventData.position, eventData.pressEventCamera, out pressPoint))
                return;

            pointerId = eventData.pointerId;
            pressCamera = eventData.pressEventCamera;
            lastScreenPosition = eventData.position;
            pressTime = Time.unscaledTimeAsDouble;
            IsPressed = true;
            IsAiming = false;
            IsOverCancelZone = false;
            Aim = Vector2.zero;
        }

        public void OnInitializePotentialDrag(PointerEventData eventData) => eventData.useDragThreshold = false;

        public void OnDrag(PointerEventData eventData)
        {
            if (!Owns(eventData))
                return;
            if (TouchInputSetup.IsCanceledTouch(eventData))
            {
                ResetInput();
                return;
            }
            UpdateAim(eventData.position, Time.unscaledTimeAsDouble);
        }

        private void Update()
        {
            // Unscaled time keeps touch interpretation consistent if gameplay slows down.
            if (IsPressed && !IsAiming && Time.unscaledTimeAsDouble - pressTime >= holdSeconds)
                UpdateAim(lastScreenPosition, Time.unscaledTimeAsDouble);
        }

        public void OnPointerUp(PointerEventData eventData)
        {
            if (!Owns(eventData))
                return;
            if (TouchInputSetup.IsCanceledTouch(eventData))
            {
                ResetInput();
                return;
            }

            // Account for a final position or hold transition arriving before Update/OnDrag.
            UpdateAim(eventData.position, Time.unscaledTimeAsDouble);
            if (!IsPressed) // An AimChanged subscriber may have disabled/canceled this control.
                return;
            bool canceled = IsOverCancelZone;
            var request = new SkillCastRequest(abilityId, Aim, !IsAiming);
            ResetInput(); // Clear capture before invoking gameplay, which may disable the HUD.
            if (!canceled)
                CastRequested?.Invoke(request);
        }

        public void OnEndDrag(PointerEventData eventData)
        {
            // Normally PointerUp already ended it. A lone EndDrag is an interruption, not a cast.
            if (Owns(eventData))
                ResetInput();
        }

        public void OnCancel(BaseEventData eventData) => ResetInput();
        private void OnDisable() => ResetInput();
        private void OnApplicationFocus(bool hasFocus) { if (!hasFocus) ResetInput(); }
        private void OnApplicationPause(bool paused) { if (paused) ResetInput(); }

        /// <summary>Cancel without casting. Call when opening a modal or switching control contexts.</summary>
        public void ResetInput()
        {
            bool wasPressed = IsPressed;
            IsPressed = false;
            IsAiming = false;
            IsOverCancelZone = false;
            Aim = Vector2.zero;
            pointerId = 0;
            pressCamera = null;
            if (wasPressed)
                AimEnded?.Invoke(abilityId);
        }

        private bool Owns(PointerEventData eventData) => IsPressed && eventData.pointerId == pointerId &&
            eventData.button == PointerEventData.InputButton.Left;

        private void UpdateAim(Vector2 screenPosition, double now)
        {
            lastScreenPosition = screenPosition;
            if (!RectTransformUtility.ScreenPointToLocalPointInRectangle(
                    inputRect, screenPosition, pressCamera, out Vector2 point))
                return;

            Vector2 offset = point - pressPoint;
            bool startedAiming = !IsAiming &&
                (offset.sqrMagnitude >= dragThreshold * dragThreshold || now - pressTime >= holdSeconds);
            if (startedAiming)
                IsAiming = true;

            bool overCancel = IsAiming && cancelZone != null &&
                RectTransformUtility.RectangleContainsScreenPoint(cancelZone, screenPosition, pressCamera);
            Vector2 aim = IsAiming ? Vector2.ClampMagnitude(offset / aimRadius, 1f) : Vector2.zero;
            bool changed = Aim != aim || IsOverCancelZone != overCancel;
            Aim = aim;
            IsOverCancelZone = overCancel;
            if (IsAiming && (startedAiming || changed))
                AimChanged?.Invoke(abilityId, Aim, IsOverCancelZone);
        }
    }
}
