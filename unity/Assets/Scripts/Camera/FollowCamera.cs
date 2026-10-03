using UnityEngine;
namespace SkyStrike.CameraRig
{
    public sealed class FollowCamera : MonoBehaviour
    {
        public Transform Target;
        public float Distance = 17, SmoothTime = .10f;
        Vector3 velocity;
        void LateUpdate()
        {
            if (Target == null) return;
            Vector3 offset = new Vector3(0, 1, -1).normalized * Distance;
            transform.position = Vector3.SmoothDamp(transform.position, Target.position + offset, ref velocity, SmoothTime);
            transform.rotation = Quaternion.Euler(45, 0, 0);
        }
        public void Zoom(float delta) { Distance = Mathf.Clamp(Distance + delta, 12, 25); }
    }
}
