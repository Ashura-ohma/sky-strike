using NUnit.Framework;
using SkyStrike.Input;
using UnityEngine;

namespace SkyStrike.Tests.Input
{
    public sealed class SafeAreaRegressionTests
    {
        [Test]
        public void InsetsAreNormalizedAndOffsetsClearedAcrossRotation()
        {
            var go = new GameObject("Safe area", typeof(RectTransform));
            try
            {
                var rect = (RectTransform)go.transform;
                rect.offsetMin = new Vector2(10, 20);
                SafeAreaPanel.Apply(rect, new Rect(100, 40, 1800, 960), new Vector2Int(2000, 1000));
                Assert.That(rect.anchorMin.x, Is.EqualTo(.05f).Within(.0001f));
                Assert.That(rect.anchorMin.y, Is.EqualTo(.04f).Within(.0001f));
                Assert.That(rect.anchorMax.x, Is.EqualTo(.95f).Within(.0001f));
                Assert.That(rect.anchorMax.y, Is.EqualTo(1));
                Assert.That(rect.offsetMin, Is.EqualTo(Vector2.zero));
                Assert.That(rect.offsetMax, Is.EqualTo(Vector2.zero));
                SafeAreaPanel.Apply(rect, new Rect(0, 100, 1000, 1800), new Vector2Int(1000, 2000));
                Assert.That(rect.anchorMin, Is.EqualTo(new Vector2(0, .05f)));
                Assert.That(rect.anchorMax, Is.EqualTo(new Vector2(1, .95f)));
            }
            finally { Object.DestroyImmediate(go); }
        }
    }
}
