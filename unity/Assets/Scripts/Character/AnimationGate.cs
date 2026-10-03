using System;
using UnityEngine;
namespace SkyStrike.Character
{
    /// <summary>Gameplay release is gated by actual Animator normalized time, never a wall-clock damage timer.</summary>
    public sealed class AnimationGate : MonoBehaviour
    {
        [SerializeField] Animator animator;
        Action release, finish;
        int requestedState;
        float releaseAt;
        bool entered, fired;
        public bool Busy => release != null || finish != null;
        public bool Released => fired;
        public void Configure(Animator value) { animator = value; }
        public bool Play(string state, float releasePoint, float playbackSpeed, Action onRelease, Action onFinished)
        {
            if (animator == null || animator.runtimeAnimatorController == null) return false;
            int hash = Animator.StringToHash(state);
            if (!animator.HasState(0, hash)) { Debug.LogError("Missing Animator state: " + state, this); return false; }
            Cancel(); requestedState = hash; releaseAt = Mathf.Clamp01(releasePoint);
            release = onRelease; finish = onFinished; fired = entered = false;
            animator.speed = Mathf.Max(.1f, playbackSpeed); animator.Play(hash, 0, 0);
            return true;
        }
        void Update()
        {
            if (!Busy || animator == null) return;
            AnimatorStateInfo state = animator.GetCurrentAnimatorStateInfo(0);
            if (state.shortNameHash != requestedState) { if (entered) Cancel(); return; }
            entered = true;
            if (!fired && state.normalizedTime >= releaseAt) { fired = true; Action callback = release; release = null; callback?.Invoke(); }
            if (state.normalizedTime >= .98f) { Action callback = finish; release = finish = null; animator.speed = 1; callback?.Invoke(); }
        }
        public void Locomotion(bool moving)
        {
            if (Busy || animator == null || animator.runtimeAnimatorController == null) return;
            int hash = Animator.StringToHash(moving ? "Run" : "Idle");
            if (animator.HasState(0, hash) && animator.GetCurrentAnimatorStateInfo(0).shortNameHash != hash) animator.CrossFade(hash, .08f);
        }
        public void Cancel() { release = finish = null; entered = fired = false; if (animator != null) animator.speed = 1; }
        void OnDisable() { Cancel(); }
    }
}
