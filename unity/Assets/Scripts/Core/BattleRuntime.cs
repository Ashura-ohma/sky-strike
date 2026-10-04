using SkyStrike.Abilities;
using SkyStrike.AI;
using SkyStrike.CameraRig;
using SkyStrike.Character;
using SkyStrike.Combat;
using SkyStrike.Data;
using SkyStrike.Input;
using SkyStrike.Targeting;
using SkyStrike.UI;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.UI;
using UnityEngine.SceneManagement;
namespace SkyStrike.Core
{
    public sealed class BattleRuntime : MonoBehaviour
    {
        public GameObject HeroPrefab;
        public Mesh CylinderMesh, CubeMesh;
        public Material WorldMaterial, IndicatorMaterial;
        public HeroDefinition Hero;
        public PooledProjectile ProjectilePrefab;
        public FloatingJoystick Joystick;
        public SkillButton[] Skills;
        public Button AttackButton, TargetButton, RestartButton;
        public Text TargetStatus;
        public RectTransform HudRoot;
        public bool Ended => ended;
        public Text Status;
        public Text[] SkillStatus;
        public FollowCamera Camera;
        ProjectilePool projectiles;
        Combatant player;
        Combatant[] bases = new Combatant[2];
        Combatant[] minions = new Combatant[18];
        float nextWave, nextStatus;
        bool ended;
        static readonly string[] SkillNames = { "VOLLEY", "DASH", "TETHER", "LANCE" };
        void Start()
        {
            Application.targetFrameRate = 60; QualitySettings.vSyncCount = 0;
            TouchInputSetup.EnsureEventSystem();
            if (RestartButton != null) { RestartButton.gameObject.SetActive(false); RestartButton.onClick.AddListener(RestartMatch); }
            projectiles = new GameObject("Projectile pool").AddComponent<ProjectilePool>(); projectiles.Initialize(ProjectilePrefab, 128);
            bases[0] = Building("West crystal", new Vector3(-23, 0, 0), 0, UnitKind.Base, 1800, Color.cyan);
            bases[1] = Building("East crystal", new Vector3(23, 0, 0), 1, UnitKind.Base, 1800, new Color(1, .3f, .2f));
            Building("West tower", new Vector3(-13, 0, 0), 0, UnitKind.Tower, 1100, Color.cyan);
            Building("East tower", new Vector3(13, 0, 0), 1, UnitKind.Tower, 1100, new Color(1, .3f, .2f));
            player = Spawn("Ilyra · player", new Vector3(-18, 0, -2), 0, UnitKind.Hero);
            Combatant rival = Spawn("Arc Warden · AI", new Vector3(18, 0, 2), 1, UnitKind.Hero);
            rival.gameObject.AddComponent<LaneBrain>().Goal = bases[0].transform;
            player.gameObject.AddComponent<RespawnController>(); rival.gameObject.AddComponent<RespawnController>();
            PlayerController controller = player.gameObject.AddComponent<PlayerController>();
            controller.Joystick = Joystick; controller.Skills = Skills; controller.CameraTransform = Camera.transform;
            AttackButton.onClick.AddListener(controller.Attack); TargetButton.onClick.AddListener(controller.SwitchTarget);
            Camera.Target = player.transform;
            AbilityIndicator indicator = player.gameObject.AddComponent<AbilityIndicator>(); indicator.IndicatorMaterial = IndicatorMaterial; indicator.Hero = Hero; indicator.Buttons = Skills; indicator.CameraTransform = Camera.transform;
            for (int i = 0; i < minions.Length; i++)
            {
                minions[i] = Spawn("Minion " + i, new Vector3(i % 2 == 0 ? -21 : 21, 0, 0), i % 2, UnitKind.Minion);
                LaneBrain brain = minions[i].gameObject.AddComponent<LaneBrain>(); brain.Goal = bases[1 - i % 2].transform;
                minions[i].gameObject.SetActive(false);
            }
            if (HudRoot != null) gameObject.AddComponent<BattleHealthHud>().Initialize(HudRoot, Camera.GetComponent<UnityEngine.Camera>(), player);
        }
        Combatant Spawn(string name, Vector3 position, int team, UnitKind kind)
        {
            GameObject unit = Instantiate(HeroPrefab, position, Quaternion.identity); unit.name = name;
            Combatant combatant = unit.GetComponent<Combatant>();
            combatant.Configure(team, kind, kind == UnitKind.Hero ? Hero.health : 220, kind == UnitKind.Hero ? Hero.mana : 0);
            unit.GetComponent<CharacterMotor>().Speed = kind == UnitKind.Hero ? Hero.movementSpeed : 3;
            unit.GetComponent<TargetingSystem>().Configure(combatant);
            unit.GetComponent<AttackController>().Configure(Hero, projectiles);
            unit.GetComponent<AbilityController>().Configure(Hero, projectiles);
            if (kind == UnitKind.Minion) unit.transform.GetChild(0).localScale *= .65f;
            GameObject mark = MeshObject("Capacitor retrieval marker", CylinderMesh); mark.transform.localScale = new Vector3(1.3f, .03f, 1.3f);
            SetColor(mark, Color.yellow); unit.GetComponent<WeaponRetrieve>().Configure(mark.transform);
            return combatant;
        }
        Combatant Building(string name, Vector3 position, int team, UnitKind kind, float hp, Color color)
        {
            GameObject root = MeshObject(name, kind == UnitKind.Tower ? CylinderMesh : CubeMesh);
            root.name = name; root.transform.position = position + Vector3.up;
            root.transform.localScale = kind == UnitKind.Tower ? new Vector3(1.3f, 2, 1.3f) : new Vector3(2, 2, 2);
            NavMeshObstacle obstacle = root.AddComponent<NavMeshObstacle>(); obstacle.carving = true; obstacle.shape = NavMeshObstacleShape.Box; obstacle.size = Vector3.one;
            SetColor(root, color); Combatant c = root.AddComponent<Combatant>(); c.Configure(team, kind, hp, 0);
            root.AddComponent<StructurePresentation>();
            root.AddComponent<TargetingSystem>().Configure(c);
            StructureAttack weapon = root.AddComponent<StructureAttack>(); weapon.Pool = projectiles;
            return c;
        }
        GameObject MeshObject(string name, Mesh mesh)
        {
            GameObject go = new GameObject(name, typeof(MeshFilter), typeof(MeshRenderer));
            go.GetComponent<MeshFilter>().sharedMesh = mesh;
            go.GetComponent<Renderer>().sharedMaterial = WorldMaterial;
            return go;
        }
        static void SetColor(GameObject go, Color color)
        {
            var properties = new MaterialPropertyBlock();
            properties.SetColor("_BaseColor", color);
            go.GetComponent<Renderer>().SetPropertyBlock(properties);
        }
        void Update()
        {
            if (player == null || ended) return;
            if (!bases[0].Alive || !bases[1].Alive)
            {
                ended = true; Status.text = !bases[1].Alive ? "VICTORY" : "DEFEAT";
                Joystick.ResetInput();
                foreach (SkillButton skill in Skills) skill.gameObject.SetActive(false);
                AttackButton.interactable = TargetButton.interactable = false;
                if (RestartButton != null) RestartButton.gameObject.SetActive(true);
                Time.timeScale = 0; return;
            }
            if (Time.time >= nextWave)
            {
                nextWave = Time.time + 12;
                for (int team = 0; team < 2; team++)
                {
                    int spawned = 0;
                    for (int i = team; i < minions.Length && spawned < 3; i += 2)
                    {
                        Combatant c = minions[i]; if (c.gameObject.activeSelf && c.Alive) continue;
                        c.gameObject.SetActive(true); c.Restore();
                        c.GetComponent<TargetingSystem>().Clear();
                        c.GetComponent<CharacterMotor>().ResetForSpawn();
                        c.GetComponent<AnimationGate>().Cancel();
                        c.GetComponent<CharacterMotor>().Warp(new Vector3(team == 0 ? -20 : 20, 0, (spawned - 1) * 1.2f));
                        spawned++;
                    }
                }
            }
            if (Time.time >= nextStatus)
            {
                nextStatus = Time.time + .2f;
                Status.text = "Ilyra  HP " + Mathf.CeilToInt(player.Health) + "/" + Mathf.CeilToInt(player.MaxHealth) + "   Mana " + Mathf.CeilToInt(player.Mana) + "\n";
                if (!player.Alive) Status.text = "Respawning in " + Mathf.CeilToInt(player.GetComponent<RespawnController>().Remaining) + "s\n";
                Combatant target = player.GetComponent<TargetingSystem>().Current;
                if (TargetStatus != null) TargetStatus.text = target != null && target.Alive ? "Target: " + target.Kind + "  " + Mathf.CeilToInt(target.Health) + "/" + Mathf.CeilToInt(target.MaxHealth) : "No target · tap ATTACK to acquire";
                AbilityController abilities = player.GetComponent<AbilityController>();
                for (int i = 0; i < 4; i++)
                {
                    if (SkillStatus == null || i >= SkillStatus.Length || SkillStatus[i] == null) continue;
                    float cooldown = abilities.CooldownRemaining(i);
                    string name = SkillNames[i];
                    SkillStatus[i].text = (i + 1) + " " + name + "\n" + (cooldown > 0 ? cooldown.ToString("0.0") + "s" : player.Mana < Hero.abilities[i].manaCost ? "LOW MANA" : Mathf.CeilToInt(Hero.abilities[i].manaCost) + " MP");
                    SkillStatus[i].color = cooldown > 0 || !player.Alive ? Color.gray : player.Mana < Hero.abilities[i].manaCost ? new Color(1,.45f,.3f) : Color.white;
                }
            }
        }
        bool restarting;
        public void RestartMatch()
        {
            if (restarting) return;
            restarting = true; Time.timeScale = 1;
            SceneManager.LoadSceneAsync(gameObject.scene.name, LoadSceneMode.Single);
        }
        void OnDestroy() { Time.timeScale = 1; }
    }
}
