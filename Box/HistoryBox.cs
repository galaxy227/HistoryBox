
using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Reflection;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Text;
using UnityEngine;

namespace HistoryBox
{
    public class WorldBoxMod : MonoBehaviour
    {
        private bool enabledRecording;
        private bool enabledDuplication;
        private object observedWorld;
        private int observedYear = -1;
        private HistorySession session;
        private SaveSlotTracker tracker;
        private float retryAfter;
        private bool errorPanelVisible;
        private int lastRecordedYear = -1;

        private void OnGUI()
        {
            float x = Screen.width - 180f;
            if (errorPanelVisible)
            {
                GUI.Box(new Rect(x, 105, 170, 85), "⚠ ERROR\nLast recorded: " + (lastRecordedYear > 0 ? "Year " + lastRecordedYear : "—"));
                if (GUI.Button(new Rect(x + 10, 155, 150, 25), "Dismiss")) errorPanelVisible = false;
            }
            GUI.Box(new Rect(x, 10, 170, 85), "HistoryBox");

            if (GUI.Button(new Rect(x + 10, 35, 150, 25), "Activator: " + (enabledRecording ? "ON" : "OFF")))
            {
                enabledRecording = !enabledRecording;

                if (!enabledRecording)
                {
                    EndSession();
                }
            }

            if (GUI.Button(new Rect(x + 10, 65, 150, 25), "Duplicator: " + (enabledDuplication ? "ON" : "OFF")))
            {
                enabledDuplication = !enabledDuplication;
            }
        }

        private void Update()
        {
            if (Config.worldLoading || MapBox.instance == null || MapBox.width <= 0 || MapBox.height <= 0)
            {
                ResetControls();
                return;
            }

            if (!enabledRecording || Time.unscaledTime < retryAfter)
            {
                return;
            }

            try
            {
                object world = MapBox.instance;
                int year = WorldReader.GetYear(world);

                if (year <= 0)
                {
                    return;
                }

                if (session == null)
                {
                    StartSession(world, year);
                    return;
                }

                if (!ReferenceEquals(world, observedWorld) || year < observedYear)
                {
                    ResetControls();
                    return;
                }

                int? savedSlot = tracker.Update();

                if (savedSlot.HasValue)
                {
                    HandleSave(savedSlot.Value, year);
                }

                if (year > session.LastYear)
                {
                    session.Record(WorldReader.Capture(world, year, session.TrackedCharacterIds));
                }

                lastRecordedYear = session.LastYear;
                observedYear = year;
            }
            catch (Exception error)
            {
                if (session != null) lastRecordedYear = session.LastYear;
                errorPanelVisible = true;
                retryAfter = Time.unscaledTime + 5f;
                Debug.LogError("[HistoryBox] " + error);
            }
        }

        private void StartSession(object world, int year)
        {
            bool created;
            string id = WorldIdentity.GetOrCreate(world, out created);
            int? slot = created ? null : SaveSlotTracker.GetLoadedSlot();
            session = new HistorySession(id, WorldReader.GetWorldName(world), slot);
            tracker = new SaveSlotTracker();
            observedWorld = world;
            observedYear = year;

            if (year > session.LastYear)
            {
                session.Record(WorldReader.Capture(world, year, session.TrackedCharacterIds));
            }

            lastRecordedYear = session.LastYear;
            Debug.Log("[HistoryBox] Recording enabled.");
        }

        private void HandleSave(int slot, int year)
        {
            if (!session.Slot.HasValue)
            {
                session.AssignSlot(slot);
            }
            else if (session.Slot.Value != slot && enabledDuplication)
            {
                session = session.Duplicate(slot, year);
                Debug.Log("[HistoryBox] History duplicated to slot " + slot);
            }
        }

        private void EndSession()
        {
            WorldReader.ClearMapCache();
            session = null;
            tracker = null;
            observedWorld = null;
            observedYear = -1;
        }

        private void ResetControls()
        {
            enabledRecording = false;
            enabledDuplication = false;
            EndSession();
        }
    }

    internal static class Performance
    {
        private static readonly bool Enabled = Environment.GetEnvironmentVariable("HISTORYBOX_PROFILE") == "1";
        public static long Begin() { return System.Diagnostics.Stopwatch.GetTimestamp(); }
        public static void End(string stage, long start)
        {
            if (Enabled) Debug.Log("[HistoryBox timing] " + stage + " " + ((System.Diagnostics.Stopwatch.GetTimestamp() - start) * 1000.0 / System.Diagnostics.Stopwatch.Frequency).ToString("F2", CultureInfo.InvariantCulture) + " ms");
        }
    }
    internal interface IInterval
    {
        object End { get; set; }
    }

    internal static class Lifecycle
    {
        public static object Begin(int year, int previous)
        {
            return previous >= 0 && year > previous + 1 ? (object)(previous + "-" + year) : year;
        }

        public static bool Close(IInterval interval, int year, int previous)
        {
            if (interval.End != null)
            {
                return false;
            }

            interval.End = Begin(year, previous);
            return true;
        }

        public static bool Open(IInterval interval)
        {
            if (interval.End == null)
            {
                return false;
            }

            interval.End = null;
            return true;
        }

        public static bool After(object date, int year)
        {
            if (date == null)
            {
                return false;
            }

            string text = Convert.ToString(date, CultureInfo.InvariantCulture);
            int dash = text.LastIndexOf('-');
            int end;
            return int.TryParse(text.Substring(dash + 1), NumberStyles.Integer, CultureInfo.InvariantCulture, out end) && end > year;
        }

        public static void Trim(IInterval item, int year)
        {
            if (After(item.End, year))
            {
                item.End = null;
            }
        }
    }

    [DataContract]
    internal sealed class MetadataRecord
    {
        [DataMember(Name = "metadata", Order = 1)] public WorldMetadata World = new WorldMetadata();
        [DataMember(Name = "map", Order = 2)] public MapMetadata Map = new MapMetadata();
        [DataMember(Name = "ages", Order = 3)] public List<AgeMetadata> Ages = new List<AgeMetadata>();
        [DataMember(Name = "kingdoms", Order = 4)] public List<KingdomMetadata> Kingdoms = new List<KingdomMetadata>();
        [DataMember(Name = "villages", Order = 5)] public List<VillageMetadata> Villages = new List<VillageMetadata>();
        [DataMember(Name = "characters", Order = 6)] public List<CharacterMetadata> Characters = new List<CharacterMetadata>();
        [DataMember(Name = "wars", Order = 7)] public List<WarMetadata> Wars = new List<WarMetadata>();
        [DataMember(Name = "alliances", Order = 8)] public List<AllianceMetadata> Alliances = new List<AllianceMetadata>();

        public bool Update(AnnualRecord record, int previous)
        {
            int year = record.World.Year;
            bool changed = false;

            if (!string.IsNullOrWhiteSpace(record.WorldName) && World.Name != record.WorldName)
            {
                World.Name = record.WorldName;
                changed = true;
            }

            if (Map.Width == 0 && Map.Height == 0 && Map.Elevation.Count == 0)
            {
                Map.Width = record.MapWidth;
                Map.Height = record.MapHeight;
                Map.Elevation = new List<int>(record.Elevation);
                changed = true;
            }
            else if (Map.Width != record.MapWidth || Map.Height != record.MapHeight || Map.Elevation.Count != record.Elevation.Count)
            {
                throw new InvalidDataException("Recorded map dimensions changed.");
            }

            changed |= UpdateAges(record.Age, year, previous);
            changed |= UpdateKingdoms(record.Kingdoms, year, previous);
            changed |= UpdateVillages(record.Villages, year, previous);
            changed |= UpdateCharacters(record.Characters, year, previous);
            changed |= UpdateWars(record.Wars, year, previous);
            changed |= UpdateAlliances(record.Alliances, year, previous);
            return changed;
        }

        private bool UpdateAges(string age, int year, int previous)
        {
            bool changed = false;
            bool found = false;

            foreach (AgeMetadata entry in Ages)
            {
                if (entry.EndYear != null)
                {
                    continue;
                }

                if (entry.Name == age)
                {
                    found = true;
                }
                else
                {
                    changed |= Lifecycle.Close(entry, year, previous);
                }
            }

            if (!found)
            {
                Ages.Add(new AgeMetadata { Name = age, StartYear = Lifecycle.Begin(year, previous) });
                changed = true;
            }

            return changed;
        }

        private bool UpdateKingdoms(List<KingdomAnnual> observed, int year, int previous)
        {
            bool changed = false;
            Dictionary<long, KingdomMetadata> known = Index(Kingdoms, item => item.Id);
            HashSet<long> seen = new HashSet<long>();

            foreach (KingdomAnnual state in observed)
            {
                seen.Add(state.Id);
                KingdomMetadata entry;

                if (!known.TryGetValue(state.Id, out entry))
                {
                    entry = new KingdomMetadata
                    {
                        Id = state.Id,
                        Name = state.Name,
                        FoundingSpecies = state.Species,
                        StartYear = Lifecycle.Begin(year, previous)
                    };

                    Kingdoms.Add(entry);
                    changed = true;
                }
                else
                {
                    changed |= Lifecycle.Open(entry);
                    if (entry.Name != state.Name) { entry.Name = state.Name; changed = true; }
                }
            }

            foreach (KingdomMetadata entry in Kingdoms)
            {
                if (!seen.Contains(entry.Id))
                {
                    changed |= Lifecycle.Close(entry, year, previous);
                }
            }

            if (changed)
            {
                Kingdoms.Sort((a, b) => a.Id.CompareTo(b.Id));
            }

            return changed;
        }

        private bool UpdateVillages(List<VillageAnnual> observed, int year, int previous)
        {
            bool changed = false;
            Dictionary<long, VillageMetadata> known = Index(Villages, item => item.Id);
            HashSet<long> seen = new HashSet<long>();

            foreach (VillageAnnual state in observed)
            {
                seen.Add(state.Id);
                VillageMetadata entry;

                if (!known.TryGetValue(state.Id, out entry))
                {
                    entry = new VillageMetadata
                    {
                        Id = state.Id,
                        Name = state.Name,
                        FoundingSpecies = state.Species,
                        StartYear = Lifecycle.Begin(year, previous)
                    };

                    Villages.Add(entry);
                    changed = true;
                }
                else
                {
                    changed |= Lifecycle.Open(entry);
                    if (entry.Name != state.Name) { entry.Name = state.Name; changed = true; }
                }
            }

            foreach (VillageMetadata entry in Villages)
            {
                if (!seen.Contains(entry.Id))
                {
                    changed |= Lifecycle.Close(entry, year, previous);
                }
            }

            if (changed)
            {
                Villages.Sort((a, b) => a.Id.CompareTo(b.Id));
            }

            return changed;
        }

        private bool UpdateCharacters(List<CharacterAnnual> observed, int year, int previous)
        {
            bool changed = false;
            Dictionary<long, CharacterMetadata> known = Index(Characters, item => item.Id);
            HashSet<long> seen = new HashSet<long>();

            // First enroll every eligible actor; relationships are resolved only after
            // newly enrolled relatives have also entered the persistent catalog.
            foreach (CharacterAnnual state in observed)
            {
                if (!seen.Add(state.Id)) throw new InvalidDataException("Duplicate character ID: " + state.Id);
                CharacterMetadata entry;

                if (!known.TryGetValue(state.Id, out entry))
                {
                    entry = new CharacterMetadata
                    {
                        Id = state.Id,
                        Name = state.Name,
                        Species = state.Species,
                        Gender = state.Gender,
                        StartYear = state.BirthYear
                    };
                    Characters.Add(entry);
                    known.Add(entry.Id, entry);
                    changed = true;
                }
                else
                {
                    if (Convert.ToInt32(entry.StartYear, CultureInfo.InvariantCulture) != state.BirthYear) throw new InvalidDataException("Character birth year changed: " + state.Id);
                    changed |= Lifecycle.Open(entry);
                    if (entry.Name != state.Name) { entry.Name = state.Name; changed = true; }
                }
            }

            foreach (CharacterMetadata entry in Characters)
            {
                if (!seen.Contains(entry.Id)) changed |= Lifecycle.Close(entry, year, previous);
            }

            // A relationship is published only when both actors have enrolled.
            // Parent IDs come from WorldBox's genealogical ActorData, not shared family IDs.
            Dictionary<long, List<long>> childrenByParent = new Dictionary<long, List<long>>();
            foreach (CharacterAnnual state in observed)
            {
                foreach (long parentId in state.ParentIds)
                {
                    if (parentId == state.Id) throw new InvalidDataException("Self-parent relationship: " + state.Id);
                    CharacterMetadata parent;
                    if (known.TryGetValue(parentId, out parent))
                    {
                        CharacterMetadata child = known[state.Id];
                        if (Convert.ToInt32(parent.StartYear, CultureInfo.InvariantCulture) > Convert.ToInt32(child.StartYear, CultureInfo.InvariantCulture)) throw new InvalidDataException("Parent born after child: " + state.Id);
                        HashSet<long> visited = new HashSet<long>();
                        Stack<long> ancestors = new Stack<long>(); ancestors.Push(parentId);
                        while (ancestors.Count > 0)
                        {
                            long ancestorId = ancestors.Pop();
                            if (ancestorId == state.Id) throw new InvalidDataException("Circular character ancestry: " + state.Id);
                            CharacterMetadata ancestor;
                            if (visited.Add(ancestorId) && known.TryGetValue(ancestorId, out ancestor)) foreach (long previousParent in ancestor.Parents) ancestors.Push(previousParent);
                        }
                        changed |= AddRelated(ref child.Parents, parentId);
                        changed |= AddRelated(ref parent.Children, state.Id);
                    }

                    List<long> children;
                    if (!childrenByParent.TryGetValue(parentId, out children))
                    {
                        children = new List<long>();
                        childrenByParent.Add(parentId, children);
                    }
                    children.Add(state.Id);
                }
            }

            // Include sibling evidence from existing tracked-parent links, including
            // previously tracked relatives who are not living in this observation.
            foreach (CharacterMetadata entry in Characters)
            {
                if (entry.Parents == null) continue;
                foreach (long parentId in entry.Parents)
                {
                    List<long> children;
                    if (!childrenByParent.TryGetValue(parentId, out children))
                    {
                        children = new List<long>();
                        childrenByParent.Add(parentId, children);
                    }
                    if (!children.Contains(entry.Id)) children.Add(entry.Id);
                }
            }

            foreach (List<long> children in childrenByParent.Values)
            {
                for (int i = 0; i < children.Count; i++)
                {
                    for (int j = i + 1; j < children.Count; j++)
                    {
                        CharacterMetadata first = known[children[i]], second = known[children[j]];
                        changed |= AddRelated(ref first.Siblings, children[j]);
                        changed |= AddRelated(ref second.Siblings, children[i]);
                    }
                }
            }

            if (changed) Characters.Sort((a, b) => a.Id.CompareTo(b.Id));
            return changed;
        }

        private static bool AddRelated(ref List<long> list, long id)
        {
            if (list == null) list = new List<long>();
            if (list.Contains(id)) return false;
            list.Add(id);
            list.Sort();
            return true;
        }

        private bool UpdateWars(List<WarAnnual> observed, int year, int previous)
        {
            bool changed = false;
            Dictionary<long, WarMetadata> known = Index(Wars, item => item.Id);
            HashSet<long> seen = new HashSet<long>();

            foreach (WarAnnual state in observed)
            {
                seen.Add(state.Id);
                WarMetadata entry;

                if (!known.TryGetValue(state.Id, out entry))
                {
                    entry = new WarMetadata
                    {
                        Id = state.Id,
                        Name = state.Name,
                        WarType = state.WarType,
                        StartYear = Lifecycle.Begin(year, previous),
                        Instigator = state.Instigator
                    };

                    Wars.Add(entry);
                    known.Add(state.Id, entry);
                    changed = true;
                }
                else
                {
                    changed |= Lifecycle.Open(entry);
                    if (entry.Name != state.Name) { entry.Name = state.Name; changed = true; }
                }

                changed |= UpdateWarMembers(entry, state.Participants, year, previous);
            }

            foreach (WarMetadata entry in Wars)
            {
                if (seen.Contains(entry.Id))
                {
                    continue;
                }

                changed |= Lifecycle.Close(entry, year, previous);
                changed |= UpdateWarMembers(entry, new List<WarParticipant>(), year, previous);
            }

            if (changed)
            {
                Wars.Sort((a, b) => a.Id.CompareTo(b.Id));
            }

            return changed;
        }

        private static bool UpdateWarMembers(WarMetadata war, List<WarParticipant> observed, int year, int previous)
        {
            bool changed = false;
            Dictionary<long, WarKingdomMetadata> known = Index(war.Kingdoms, item => item.KingdomId);
            Dictionary<long, string> active = new Dictionary<long, string>();

            foreach (WarParticipant state in observed)
            {
                if (active.ContainsKey(state.KingdomId))
                {
                    throw new InvalidDataException("Kingdom appears twice in the same war: " + state.KingdomId);
                }

                active.Add(state.KingdomId, state.Side);
                WarKingdomMetadata kingdom;

                if (!known.TryGetValue(state.KingdomId, out kingdom))
                {
                    kingdom = new WarKingdomMetadata { KingdomId = state.KingdomId };
                    war.Kingdoms.Add(kingdom);
                    known.Add(state.KingdomId, kingdom);
                    changed = true;
                }

                WarInvolvement current = null;

                foreach (WarInvolvement interval in kingdom.Involvement)
                {
                    if (interval.EndYear == null)
                    {
                        current = interval;
                    }
                }

                if (current != null && current.Side != state.Side)
                {
                    changed |= Lifecycle.Close(current, year, previous);
                    current = null;
                }

                if (current == null)
                {
                    kingdom.Involvement.Add(new WarInvolvement
                    {
                        Side = state.Side,
                        StartYear = Lifecycle.Begin(year, previous)
                    });
                    changed = true;
                }
            }

            foreach (WarKingdomMetadata kingdom in war.Kingdoms)
            {
                if (active.ContainsKey(kingdom.KingdomId))
                {
                    continue;
                }

                foreach (WarInvolvement interval in kingdom.Involvement)
                {
                    changed |= Lifecycle.Close(interval, year, previous);
                }
            }

            if (changed)
            {
                war.Kingdoms.Sort((a, b) => a.KingdomId.CompareTo(b.KingdomId));
            }

            return changed;
        }

        private bool UpdateAlliances(List<AllianceState> observed, int year, int previous)
        {
            bool changed = false;
            Dictionary<long, AllianceMetadata> known = Index(Alliances, item => item.Id);
            HashSet<long> seen = new HashSet<long>();

            foreach (AllianceState state in observed)
            {
                seen.Add(state.Id);
                AllianceMetadata entry;

                if (!known.TryGetValue(state.Id, out entry))
                {
                    entry = new AllianceMetadata
                    {
                        Id = state.Id,
                        Name = state.Name,
                        StartYear = Lifecycle.Begin(year, previous)
                    };

                    Alliances.Add(entry);
                    known.Add(state.Id, entry);
                    changed = true;
                }
                else
                {
                    changed |= Lifecycle.Open(entry);
                    if (entry.Name != state.Name) { entry.Name = state.Name; changed = true; }
                }

                changed |= UpdateAllianceMembers(entry, state.Kingdoms, year, previous);
            }

            foreach (AllianceMetadata entry in Alliances)
            {
                if (seen.Contains(entry.Id))
                {
                    continue;
                }

                changed |= Lifecycle.Close(entry, year, previous);
                changed |= UpdateAllianceMembers(entry, new List<long>(), year, previous);
            }

            if (changed)
            {
                Alliances.Sort((a, b) => a.Id.CompareTo(b.Id));
            }

            return changed;
        }

        private static bool UpdateAllianceMembers(AllianceMetadata alliance, List<long> observed, int year, int previous)
        {
            bool changed = false;
            HashSet<long> active = new HashSet<long>(observed);
            Dictionary<long, AllianceKingdomMetadata> known = Index(alliance.Kingdoms, item => item.KingdomId);

            foreach (long id in active)
            {
                AllianceKingdomMetadata kingdom;

                if (!known.TryGetValue(id, out kingdom))
                {
                    kingdom = new AllianceKingdomMetadata { KingdomId = id };
                    alliance.Kingdoms.Add(kingdom);
                    known.Add(id, kingdom);
                    changed = true;
                }

                bool currentlyInvolved = false;

                foreach (AllianceInvolvement interval in kingdom.Involvement)
                {
                    if (interval.EndYear == null)
                    {
                        currentlyInvolved = true;
                    }
                }

                if (!currentlyInvolved)
                {
                    kingdom.Involvement.Add(new AllianceInvolvement { StartYear = Lifecycle.Begin(year, previous) });
                    changed = true;
                }
            }

            foreach (AllianceKingdomMetadata kingdom in alliance.Kingdoms)
            {
                if (active.Contains(kingdom.KingdomId))
                {
                    continue;
                }

                foreach (AllianceInvolvement interval in kingdom.Involvement)
                {
                    changed |= Lifecycle.Close(interval, year, previous);
                }
            }

            if (changed)
            {
                alliance.Kingdoms.Sort((a, b) => a.KingdomId.CompareTo(b.KingdomId));
            }

            return changed;
        }

        public void RetainRecordedCharacters(ISet<long> ids)
        {
            Characters.RemoveAll(item => !ids.Contains(item.Id));
            foreach (CharacterMetadata character in Characters)
            {
                if (character.Parents != null) character.Parents.RemoveAll(id => !ids.Contains(id));
                if (character.Siblings != null) character.Siblings.RemoveAll(id => !ids.Contains(id));
                if (character.Children != null) character.Children.RemoveAll(id => !ids.Contains(id));
            }
        }

        private static Dictionary<long, T> Index<T>(IEnumerable<T> entries, Func<T, long> key)
        {
            Dictionary<long, T> result = new Dictionary<long, T>();

            foreach (T entry in entries)
            {
                result.Add(key(entry), entry);
            }

            return result;
        }

        public void Trim(int year)
        {
            Ages.RemoveAll(item => Lifecycle.After(item.StartYear, year));
            Kingdoms.RemoveAll(item => Lifecycle.After(item.StartYear, year));
            Villages.RemoveAll(item => Lifecycle.After(item.StartYear, year));
            Characters.RemoveAll(item => Lifecycle.After(item.StartYear, year));
            Wars.RemoveAll(item => Lifecycle.After(item.StartYear, year));
            Alliances.RemoveAll(item => Lifecycle.After(item.StartYear, year));

            foreach (AgeMetadata item in Ages)
            {
                Lifecycle.Trim(item, year);
            }

            foreach (KingdomMetadata item in Kingdoms)
            {
                Lifecycle.Trim(item, year);
            }

            foreach (VillageMetadata item in Villages)
            {
                Lifecycle.Trim(item, year);
            }

            HashSet<long> retainedCharacters = new HashSet<long>();
            foreach (CharacterMetadata item in Characters) retainedCharacters.Add(item.Id);
            foreach (CharacterMetadata item in Characters)
            {
                Lifecycle.Trim(item, year);
                if (item.Parents != null) item.Parents.RemoveAll(id => !retainedCharacters.Contains(id));
                if (item.Siblings != null) item.Siblings.RemoveAll(id => !retainedCharacters.Contains(id));
                if (item.Children != null) item.Children.RemoveAll(id => !retainedCharacters.Contains(id));
            }

            foreach (WarMetadata war in Wars)
            {
                Lifecycle.Trim(war, year);

                foreach (WarKingdomMetadata kingdom in war.Kingdoms)
                {
                    kingdom.Involvement.RemoveAll(item => Lifecycle.After(item.StartYear, year));

                    foreach (WarInvolvement item in kingdom.Involvement)
                    {
                        Lifecycle.Trim(item, year);
                    }
                }

                war.Kingdoms.RemoveAll(item => item.Involvement.Count == 0);
            }

            foreach (AllianceMetadata alliance in Alliances)
            {
                Lifecycle.Trim(alliance, year);

                foreach (AllianceKingdomMetadata kingdom in alliance.Kingdoms)
                {
                    kingdom.Involvement.RemoveAll(item => Lifecycle.After(item.StartYear, year));

                    foreach (AllianceInvolvement item in kingdom.Involvement)
                    {
                        Lifecycle.Trim(item, year);
                    }
                }

                alliance.Kingdoms.RemoveAll(item => item.Involvement.Count == 0);
            }
        }
    }

    [DataContract]
    internal sealed class WorldMetadata
    {
        [DataMember(Name = "id", Order = 1)] public string Id;
        [DataMember(Name = "name", Order = 2)] public string Name;
        [DataMember(Name = "slot", Order = 3)] public int? Slot;
        [DataMember(Name = "year", Order = 4)] public int Year = -1;
    }

    [DataContract]
    internal sealed class MapMetadata
    {
        [DataMember(Name = "width", Order = 1)] public int Width;
        [DataMember(Name = "height", Order = 2)] public int Height;
        [DataMember(Name = "elevation", Order = 3)] public List<int> Elevation = new List<int>();
    }

    [DataContract]
    internal sealed class AgeMetadata : IInterval
    {
        [DataMember(Name = "name", Order = 1)] public string Name;
        [DataMember(Name = "start_year", Order = 2)] public object StartYear;
        [DataMember(Name = "end_year", Order = 3)] public object EndYear;
        object IInterval.End { get { return EndYear; } set { EndYear = value; } }
    }

    [DataContract]
    internal sealed class KingdomMetadata : IInterval
    {
        [DataMember(Name = "id", Order = 1)] public long Id;
        [DataMember(Name = "name", Order = 2)] public string Name;
        [DataMember(Name = "founding_species", Order = 3)] public string FoundingSpecies;
        [DataMember(Name = "start_year", Order = 4)] public object StartYear;
        [DataMember(Name = "end_year", Order = 5)] public object EndYear;
        object IInterval.End { get { return EndYear; } set { EndYear = value; } }
    }

    [DataContract]
    internal sealed class VillageMetadata : IInterval
    {
        [DataMember(Name = "id", Order = 1)] public long Id;
        [DataMember(Name = "name", Order = 2)] public string Name;
        [DataMember(Name = "founding_species", Order = 3)] public string FoundingSpecies;
        [DataMember(Name = "start_year", Order = 4)] public object StartYear;
        [DataMember(Name = "end_year", Order = 5)] public object EndYear;
        object IInterval.End { get { return EndYear; } set { EndYear = value; } }
    }

    [DataContract]
    internal sealed class CharacterMetadata : IInterval
    {
        [DataMember(Name = "id", Order = 1)] public long Id;
        [DataMember(Name = "name", Order = 2)] public string Name;
        [DataMember(Name = "species", Order = 3)] public string Species;
        [DataMember(Name = "gender", Order = 4)] public string Gender;
        [DataMember(Name = "start_year", Order = 5)] public object StartYear;
        [DataMember(Name = "end_year", Order = 6)] public object EndYear;
        [DataMember(Name = "p", Order = 7)] public List<long> Parents = new List<long>();
        [DataMember(Name = "s", Order = 8)] public List<long> Siblings = new List<long>();
        [DataMember(Name = "c", Order = 9)] public List<long> Children = new List<long>();
        object IInterval.End { get { return EndYear; } set { EndYear = value; } }
    }

    [DataContract]
    internal sealed class WarMetadata : IInterval
    {
        [DataMember(Name = "id", Order = 1)] public long Id;
        [DataMember(Name = "name", Order = 2)] public string Name;
        [DataMember(Name = "war_type", Order = 3)] public string WarType;
        [DataMember(Name = "start_year", Order = 4)] public object StartYear;
        [DataMember(Name = "end_year", Order = 5)] public object EndYear;
        [DataMember(Name = "instigator", Order = 6)] public long? Instigator;
        [DataMember(Name = "kingdoms", Order = 7)] public List<WarKingdomMetadata> Kingdoms = new List<WarKingdomMetadata>();
        object IInterval.End { get { return EndYear; } set { EndYear = value; } }
    }

    [DataContract]
    internal sealed class WarKingdomMetadata
    {
        [DataMember(Name = "kingdom_id", Order = 1)] public long KingdomId;
        [DataMember(Name = "involvement", Order = 2)] public List<WarInvolvement> Involvement = new List<WarInvolvement>();
    }

    [DataContract]
    internal sealed class WarInvolvement : IInterval
    {
        [DataMember(Name = "side", Order = 1)] public string Side;
        [DataMember(Name = "start_year", Order = 2)] public object StartYear;
        [DataMember(Name = "end_year", Order = 3)] public object EndYear;
        object IInterval.End { get { return EndYear; } set { EndYear = value; } }
    }

    [DataContract]
    internal sealed class AllianceMetadata : IInterval
    {
        [DataMember(Name = "id", Order = 1)] public long Id;
        [DataMember(Name = "name", Order = 2)] public string Name;
        [DataMember(Name = "start_year", Order = 3)] public object StartYear;
        [DataMember(Name = "end_year", Order = 4)] public object EndYear;
        [DataMember(Name = "kingdoms", Order = 5)] public List<AllianceKingdomMetadata> Kingdoms = new List<AllianceKingdomMetadata>();
        object IInterval.End { get { return EndYear; } set { EndYear = value; } }
    }

    [DataContract]
    internal sealed class AllianceKingdomMetadata
    {
        [DataMember(Name = "kingdom_id", Order = 1)] public long KingdomId;
        [DataMember(Name = "involvement", Order = 2)] public List<AllianceInvolvement> Involvement = new List<AllianceInvolvement>();
    }

    [DataContract]
    internal sealed class AllianceInvolvement : IInterval
    {
        [DataMember(Name = "start_year", Order = 1)] public object StartYear;
        [DataMember(Name = "end_year", Order = 2)] public object EndYear;
        object IInterval.End { get { return EndYear; } set { EndYear = value; } }
    }

    [DataContract]
    internal sealed class AnnualRecord
    {
        [DataMember(Name = "map", Order = 1)] public List<int[]> Map = new List<int[]>();
        [DataMember(Name = "world", Order = 2)] public WorldAnnual World = new WorldAnnual();
        [DataMember(Name = "kingdoms", Order = 3)] public List<KingdomAnnual> Kingdoms = new List<KingdomAnnual>();
        [DataMember(Name = "villages", Order = 4)] public List<VillageAnnual> Villages = new List<VillageAnnual>();
        [DataMember(Name = "characters", Order = 5)] public List<CharacterAnnual> Characters = new List<CharacterAnnual>();
        [DataMember(Name = "wars", Order = 6)] public List<WarAnnual> Wars = new List<WarAnnual>();
        public int MapWidth;
        public int MapHeight;
        public List<int> Elevation = new List<int>();
        public string WorldName;
        public string Age;
        public List<AllianceState> Alliances = new List<AllianceState>();
    }

    [DataContract]
    internal sealed class WorldAnnual
    {
        [DataMember(Name = "year", Order = 1)] public int Year;
        [DataMember(Name = "global_population", Order = 2)] public int GlobalPopulation;
        [DataMember(Name = "human", Order = 3)] public int Human;
        [DataMember(Name = "elf", Order = 4)] public int Elf;
        [DataMember(Name = "orc", Order = 5)] public int Orc;
        [DataMember(Name = "dwarf", Order = 6)] public int Dwarf;

        public void Count(string species)
        {
            switch (species)
            {
                case "human": Human++; break;
                case "elf": Elf++; break;
                case "orc": Orc++; break;
                case "dwarf": Dwarf++; break;
            }
        }

        public void Finish()
        {
            GlobalPopulation = checked(checked(Human + Elf) + checked(Orc + Dwarf));
        }
    }

    [DataContract]
    internal sealed class KingdomAnnual
    {
        [DataMember(Name = "id", Order = 1)] public long Id;
        [DataMember(Name = "cities", Order = 2)] public List<long> Cities = new List<long>();
        [DataMember(Name = "king_id", Order = 3)] public long? KingId;
        public long? CapitalId; // Capture-only: capital-first ordering of cities; not serialized.
        public string Name;
        public string Species;
    }

    [DataContract]
    internal sealed class VillageAnnual
    {
        [DataMember(Name = "id", Order = 1)] public long Id;
        [DataMember(Name = "kingdom_id", Order = 2)] public long? KingdomId;
        [DataMember(Name = "population", Order = 3)] public int Population;
        [DataMember(Name = "human", Order = 4)] public int Human;
        [DataMember(Name = "elf", Order = 5)] public int Elf;
        [DataMember(Name = "orc", Order = 6)] public int Orc;
        [DataMember(Name = "dwarf", Order = 7)] public int Dwarf;
        [DataMember(Name = "army", Order = 8)] public int Army;
        [DataMember(Name = "loyalty", Order = 9)] public int Loyalty;
        [DataMember(Name = "houses", Order = 10)] public int Houses;
        [DataMember(Name = "food", Order = 11)] public int Food;
        [DataMember(Name = "coins", Order = 12)] public int Coins;
        [DataMember(Name = "leader_id", Order = 13)] public long? LeaderId;
        [DataMember(Name = "territory", Order = 14)] public List<int> Territory = new List<int>();
        public string Name;
        public string Species;

        public void Count(string species)
        {
            switch (species)
            {
                case "human": Human++; break;
                case "elf": Elf++; break;
                case "orc": Orc++; break;
                case "dwarf": Dwarf++; break;
            }
        }
    }

    [DataContract]
    internal sealed class CharacterAnnual
    {
        [DataMember(Name = "id", Order = 1)] public long Id;
        [DataMember(Name = "kingdom_id", Order = 2)] public long? KingdomId;
        [DataMember(Name = "village_id", Order = 3)] public long? VillageId;
        [DataMember(Name = "role", Order = 4)] public string Role;
        [DataMember(Name = "level", Order = 5)] public int? Level;
        [DataMember(Name = "coins", Order = 6)] public int? Coins;
        [DataMember(Name = "kills", Order = 7)] public int? Kills;

        // Capture-only fields: used to maintain the permanent overview, not serialized annually.
        public string Name;
        public string Species;
        public string Gender;
        public int BirthYear;
        public List<long> ParentIds = new List<long>();
    }

    [DataContract]
    internal sealed class WarAnnual
    {
        [DataMember(Name = "id", Order = 1)] public long Id;
        [DataMember(Name = "attacker_deaths", Order = 2)] public int AttackerDeaths;
        [DataMember(Name = "defender_deaths", Order = 3)] public int DefenderDeaths;
        public string Name;
        public string WarType;
        public long? Instigator;
        public List<WarParticipant> Participants = new List<WarParticipant>();
    }

    internal sealed class WarParticipant
    {
        public long KingdomId;
        public string Side;
    }

    internal sealed class AllianceState
    {
        public long Id;
        public string Name;
        public List<long> Kingdoms = new List<long>();
    }

    internal static class WorldReader
    {
        public static int GetYear(object world)
        {
            return Reader.Int(Reader.Call(Reader.Require(world, "map_stats"), "get_year"));
        }

        public static string GetWorldName(object world)
        {
            object stats = Reader.Require(world, "map_stats");
            return Reader.First(Reader.Text(stats, "name"), Reader.Text(Reader.Get(stats, "data"), "name"));
        }

        public static AnnualRecord Capture(object world, int year, ISet<long> trackedCharacters)
        {
            AnnualRecord record = new AnnualRecord { WorldName = GetWorldName(world) };
            record.World.Year = year;
            record.Age = ReadAge(world);
            long timing = Performance.Begin();
            ZoneMap map = ReadMap(world, record);
            Performance.End("capture-map", timing);
            timing = Performance.Begin();
            ReadWorldPopulation(world, record.World);
            ReadKingdoms(world, record.Kingdoms);
            ReadVillages(world, record.Villages, map);
            ReadCharacters(world, record, trackedCharacters, year);
            ReadWars(world, record.Wars);
            ReadAlliances(world, record.Alliances);
            NormalizeOwnership(record);
            Validate(record);
            Performance.End("capture-entities", timing);
            if (GetYear(world) != year) throw new InvalidDataException("World year changed during capture.");
            return record;
        }

        internal static void NormalizeOwnership(AnnualRecord record)
        {
            Dictionary<long, KingdomAnnual> kingdoms = new Dictionary<long, KingdomAnnual>();
            foreach (KingdomAnnual kingdom in record.Kingdoms) { kingdoms.Add(kingdom.Id, kingdom); kingdom.Cities.Clear(); }
            foreach (VillageAnnual village in record.Villages)
            {
                KingdomAnnual owner;
                if (village.KingdomId.HasValue && kingdoms.TryGetValue(village.KingdomId.Value, out owner)) owner.Cities.Add(village.Id);
                else village.KingdomId = null; // No active civilization owns this settlement in this snapshot.
            }
            foreach (KingdomAnnual kingdom in record.Kingdoms)
            {
                kingdom.Cities.Sort();
                // The game may own villages before its capital behavior runs.
                if (kingdom.CapitalId.HasValue && kingdom.Cities.Remove(kingdom.CapitalId.Value))
                    kingdom.Cities.Insert(0, kingdom.CapitalId.Value);
                else kingdom.CapitalId = null;
            }
            foreach (WarAnnual war in record.Wars) war.Participants.RemoveAll(p => !kingdoms.ContainsKey(p.KingdomId));
            foreach (AllianceState alliance in record.Alliances) alliance.Kingdoms.RemoveAll(id => !kingdoms.ContainsKey(id));
        }

        internal static void Validate(AnnualRecord record)
        {
            if (record.World == null || record.World.Year < 0) throw new InvalidDataException("Missing annual world/year.");
            if (record.MapWidth <= 0 || record.MapHeight <= 0 || (long)record.MapWidth * record.MapHeight != record.Elevation.Count) throw new InvalidDataException("Invalid map dimensions or elevation count.");
            foreach (int elevation in record.Elevation) if (elevation < 0 || elevation > 3) throw new InvalidDataException("Invalid map elevation category.");
            HashSet<int> assignedZones = new HashSet<int>();
            if (record.World.GlobalPopulation < 0 || record.World.Human < 0 || record.World.Elf < 0 || record.World.Orc < 0 || record.World.Dwarf < 0 || (long)record.World.Human + record.World.Elf + record.World.Orc + record.World.Dwarf != record.World.GlobalPopulation) throw new InvalidDataException("Inconsistent world population.");
            foreach (VillageAnnual v in record.Villages)
            {
                if (v.Population < 0 || v.Human < 0 || v.Elf < 0 || v.Orc < 0 || v.Dwarf < 0 || v.Army < 0 || v.Houses < 0 || v.Food < 0 || v.Coins < 0 || (long)v.Human + v.Elf + v.Orc + v.Dwarf > v.Population) throw new InvalidDataException("Invalid village measurements: " + v.Id);
                if (v.Territory == null || v.Territory.Count == 0) throw new InvalidDataException("Village territory must contain a bonfire ID or -1: " + v.Id);
                for (int i = 0; i < v.Territory.Count; i++)
                {
                    int id = v.Territory[i];
                    if (i > 1 && id <= v.Territory[i - 1]) throw new InvalidDataException("Unsorted village territory zones: " + v.Id);
                    if (id == -1 && i == 0) continue;
                    if (id < 0 || id >= record.Elevation.Count || !assignedZones.Add(id)) throw new InvalidDataException("Invalid or duplicated territory zone: " + id);
                }
            }
            HashSet<long> characterIds = new HashSet<long>();
            HashSet<long> villageIds = new HashSet<long>();
            HashSet<long> kingdomIds = new HashSet<long>();
            foreach (VillageAnnual village in record.Villages) villageIds.Add(village.Id);
            foreach (KingdomAnnual kingdom in record.Kingdoms) kingdomIds.Add(kingdom.Id);
            foreach (CharacterAnnual character in record.Characters)
            {
                if (!characterIds.Add(character.Id)) throw new InvalidDataException("Duplicate character ID: " + character.Id);
                if (character.BirthYear < 0 || character.BirthYear > record.World.Year) throw new InvalidDataException("Invalid character birth year: " + character.Id);
                if (character.Role != null && character.Role != "king" && character.Role != "leader" && character.Role != "captain" && character.Role != "warrior" && character.Role != "citizen") throw new InvalidDataException("Invalid character role: " + character.Id);
                if (character.Level.HasValue && character.Level.Value < 0 || character.Coins.HasValue && character.Coins.Value < 0 || character.Kills.HasValue && character.Kills.Value < 0) throw new InvalidDataException("Invalid character measurements: " + character.Id);
                if (character.KingdomId.HasValue && !kingdomIds.Contains(character.KingdomId.Value)) throw new InvalidDataException("Unresolved character kingdom: " + character.Id);
                if (character.VillageId.HasValue && !villageIds.Contains(character.VillageId.Value)) throw new InvalidDataException("Unresolved character home: " + character.Id);
            }
            HashSet<long> kings = new HashSet<long>(), leaders = new HashSet<long>();
            foreach (CharacterAnnual c in record.Characters)
            {
                VillageAnnual home = record.Villages.Find(v => c.VillageId == v.Id);
                if (home != null && home.KingdomId != c.KingdomId) throw new InvalidDataException("Character affiliation disagrees with home village: " + c.Id);
                if (c.Role == "king" && (!c.KingdomId.HasValue || !kings.Add(c.KingdomId.Value) || record.Kingdoms.Find(k => k.Id == c.KingdomId).KingId != c.Id)) throw new InvalidDataException("Unverified or duplicate king: " + c.Id);
                if (c.Role == "leader" && (home == null || !leaders.Add(home.Id) || home.LeaderId != c.Id)) throw new InvalidDataException("Unverified or duplicate village leader: " + c.Id);
            }
            foreach (KingdomAnnual k in record.Kingdoms) if (k.KingId.HasValue && !record.Characters.Exists(c => c.Id == k.KingId && c.Role == "king" && c.KingdomId == k.Id)) throw new InvalidDataException("King not captured: " + k.Id);
            foreach (VillageAnnual v in record.Villages) if (v.LeaderId.HasValue && !record.Characters.Exists(c => c.Id == v.LeaderId && c.Role == "leader" && c.VillageId == v.Id)) throw new InvalidDataException("Leader not captured: " + v.Id);
            foreach (WarAnnual war in record.Wars) if (war.AttackerDeaths < 0 || war.DefenderDeaths < 0) throw new InvalidDataException("Invalid war casualties: " + war.Id);
        }

        // Every WorldBox TileZone is translated into our own bottom-left row-major ID.
        // No game-internal zone ID or enumeration order is exposed in the output.
        private sealed class ZoneMap
        {
            public int Width;
            public int Height;
            public Dictionary<long, int> Ids = new Dictionary<long, int>();
            public Dictionary<int, object> Zones = new Dictionary<int, object>();

            public int Index(object zone)
            {
                if (zone == null) throw new InvalidDataException("Missing WorldBox tile zone.");
                long internalId = Reader.Id(zone);
                int index;
                if (!Ids.TryGetValue(internalId, out index)) throw new InvalidDataException("Unmapped WorldBox tile zone: " + internalId);
                return index;
            }
        }

        private static object cachedWorld, cachedCalculator;
        private static ZoneMap cachedMap;
        private static readonly Dictionary<TileTypeBase, int> terrainClasses = new Dictionary<TileTypeBase, int>();
        internal static void ClearMapCache() { cachedWorld = null; cachedCalculator = null; cachedMap = null; terrainClasses.Clear(); }
        private static ZoneMap ReadMap(object world, AnnualRecord record)
        {
            object calculator = Reader.Require(world, "zone_calculator");
            int width = Reader.Int(Reader.Require(calculator, "zones_total_x")), height = Reader.Int(Reader.Require(calculator, "zones_total_y"));
            if (width <= 0 || height <= 0 || (long)width * height > int.MaxValue || ((long)MapBox.width + 7) / 8 != width || ((long)MapBox.height + 7) / 8 != height) throw new InvalidDataException("Invalid WorldBox zone grid dimensions.");
            bool rebuild = !ReferenceEquals(cachedWorld, world) || !ReferenceEquals(cachedCalculator, calculator) || cachedMap == null || cachedMap.Width != width || cachedMap.Height != height;
            ZoneMap result = rebuild ? new ZoneMap { Width = width, Height = height } : cachedMap;
            int count = width * height;
            // A per-capture array owns the immutable observation; only lookup geometry
            // and asset classifications survive between captures, never elevations.
            int[] elevations = new int[count];
            bool[] seen = new bool[count]; int zones = 0;
            foreach (object raw in Reader.Enumerate(Reader.Require(calculator, "zones")))
            {
                TileZone zone = raw as TileZone;
                if (zone == null) throw new InvalidDataException("Missing WorldBox tile zone.");
                int x = zone.x, y = zone.y;
                if (x < 0 || x >= width || y < 0 || y >= height) throw new InvalidDataException("Zone coordinate is outside map.");
                int index = y * width + x;
                if (seen[index]) throw new InvalidDataException("Duplicate WorldBox zone coordinate.");
                seen[index] = true; zones++;
                if (rebuild)
                {
                    if (result.Ids.ContainsKey(zone.id)) throw new InvalidDataException("Duplicate WorldBox zone ID.");
                    result.Ids.Add(zone.id, index); result.Zones.Add(index, zone);
                }
                else if (!ReferenceEquals(result.Zones[index], zone) || !result.Ids.ContainsKey(zone.id) || result.Ids[zone.id] != index)
                {
                    ClearMapCache(); return ReadMap(world, record); // Same MapBox instance may reload geometry.
                }
                int water = 0, plain = 0, hill = 0, mountain = 0, tiles = 0; ulong positions = 0;
                if (zone.tiles == null) throw new InvalidDataException("Missing zone tiles.");
                foreach (WorldTile tile in zone.tiles)
                {
                    if (tile == null) continue;
                    int tx = tile.x, ty = tile.y;
                    if (!ReferenceEquals(tile.zone, zone) || tx < 0 || ty < 0 || tx >= MapBox.width || ty >= MapBox.height || tx / 8 != x || ty / 8 != y) throw new InvalidDataException("Tile geometry disagrees with its zone.");
                    ulong bit = 1UL << ((ty % 8) * 8 + tx % 8);
                    if ((positions & bit) != 0) throw new InvalidDataException("Duplicate tile in WorldBox zone.");
                    positions |= bit;
                    TileTypeBase type = (TileTypeBase)tile.main_type ?? Reader.Get(tile, "cur_tile_type") as TileTypeBase;
                    if (type == null) throw new InvalidDataException("Tile has no terrain type.");
                    int category;
                    if (!terrainClasses.TryGetValue(type, out category)) { category = TileElevation(type); terrainClasses.Add(type, category); }
                    if (category == 0) water++; else if (category == 1) plain++; else if (category == 2) hill++; else mountain++;
                    tiles++;
                }
                if (tiles != Math.Min(8, MapBox.width - x * 8) * Math.Min(8, MapBox.height - y * 8)) throw new InvalidDataException("Incomplete WorldBox zone tile coverage.");
                int chosen = 0, majority = water;
                if (plain >= majority) { chosen = 1; majority = plain; }
                if (hill >= majority) { chosen = 2; majority = hill; }
                if (mountain >= majority) chosen = 3;
                elevations[index] = chosen;
            }
            if (zones != count) throw new InvalidDataException("Incomplete WorldBox zone grid.");
            cachedWorld = world; cachedCalculator = calculator; cachedMap = result;
            record.MapWidth = width; record.MapHeight = height; record.Elevation = new List<int>(elevations);
            return result;
        }
        private static int TileElevation(TileTypeBase type)
        {
            string id = type.id;
            if (type.summit || type.mountains || id == "summit" || id == "mountains") return 3;
            if (type.rocks || id == "hills") return 2;
            if (type.ocean || id == "deep_ocean" || id == "close_ocean" || id == "shallow_waters" || id == "pit_deep_ocean" || id == "pit_close_ocean" || id == "pit_shallow_waters") return 0;
            if (type.ground || id == "sand" || id == "soil_low" || id == "soil_high" || type.lava || id == "grey_goo") return 1;
            throw new InvalidDataException("Unclassified WorldBox terrain type: " + (id ?? "null"));
        }

        private static int BonfireZone(object world, object city, ZoneMap map, List<int> territory)
        {
            object buildings = Reader.CallString(city, "getBuildingListOfID", "bonfire");
            if (buildings == null) return -1;
            int result = -1;
            foreach (object building in Reader.Enumerate(buildings))
            {
                if (building == null || Reader.Inactive(building)) continue;
                if (Reader.Call(building, "isNormal") as bool? != true) continue;
                object data = Reader.Require(building, "data");
                int x = Reader.Int(Reader.Require(data, "mainX")), y = Reader.Int(Reader.Require(data, "mainY"));
                if (x < 0 || x >= MapBox.width || y < 0 || y >= MapBox.height) throw new InvalidDataException("Bonfire anchor is outside the world map.");
                object tile = Reader.CallXY(world, "GetTile", x, y);
                object zone = Reader.Require(tile, "zone");
                int id = map.Index(zone);
                if (!territory.Contains(id)) continue;
                if (result >= 0 && result != id) throw new InvalidDataException("Multiple bonfire zones found for one village.");
                result = id;
            }
            return result;
        }

        private static string ReadAge(object world)
        {
            object manager = Reader.Require(world, "era_manager");
            object asset = Reader.Call(manager, "getCurrentAge");
            string id = Reader.First(Reader.Text(asset, "id"), Reader.TryCallString(asset, "getLocaleID"));

            if (id == null)
            {
                throw new InvalidDataException("Cannot determine WorldBox age.");
            }

            string key = Reader.TryCallString(asset, "getLocaleID");
            string translated = Reader.Localize(key);
            return !string.IsNullOrWhiteSpace(translated) ? translated : id;
        }

        private static void ReadWorldPopulation(object world, WorldAnnual result)
        {
            object units = Reader.Require(Reader.Require(world, "units"), "units_only_alive");

            foreach (object actor in Reader.Enumerate(units))
            {
                if (actor != null && !Reader.Inactive(actor))
                {
                    result.Count(ActorSpecies(actor));
                }
            }

            result.Finish();
        }

        private static void ReadKingdoms(object world, List<KingdomAnnual> result)
        {
            HashSet<long> ids = new HashSet<long>();

            foreach (object kingdom in Reader.Enumerate(Reader.Require(world, "kingdoms")))
            {
                if (kingdom == null || Reader.Inactive(kingdom) || Reader.TryCall(kingdom, "isCiv") as bool? != true)
                {
                    continue;
                }

                object data = Reader.Get(kingdom, "data");
                long id = Reader.Id(kingdom);

                if (!ids.Add(id))
                {
                    throw new InvalidDataException("Duplicate kingdom ID: " + id);
                }

                KingdomAnnual entry = new KingdomAnnual
                {
                    Id = id,
                    Name = Reader.Name(kingdom),
                    Species = Reader.Text(Reader.Call(kingdom, "getFounderSpecies"), "id"),
                    KingId = LiveId(Reader.Member(kingdom, "king")),
                    CapitalId = LiveId(Reader.Member(kingdom, "capital"))
                };

                foreach (object city in Reader.Enumerate(Reader.Require(kingdom, "cities")))
                {
                    if (city != null && !Reader.Inactive(city))
                    {
                        entry.Cities.Add(Reader.Id(city));
                    }
                }

                entry.Cities.Sort();
                result.Add(entry);
            }

            result.Sort((a, b) => a.Id.CompareTo(b.Id));
        }

        private static void ReadVillages(object world, List<VillageAnnual> result, ZoneMap map)
        {
            HashSet<long> ids = new HashSet<long>();

            foreach (object city in Reader.Enumerate(Reader.Require(world, "cities")))
            {
                if (city == null || Reader.Inactive(city))
                {
                    continue;
                }

                long id = Reader.Id(city);

                if (!ids.Add(id))
                {
                    throw new InvalidDataException("Duplicate village ID: " + id);
                }

                object kingdom = Reader.Get(city, "kingdom");
                VillageAnnual entry = new VillageAnnual
                {
                    Id = id,
                    KingdomId = kingdom == null ? (long?)null : Reader.Id(kingdom),
                    LeaderId = LiveId(Reader.Member(city, "leader")),
                    Name = Reader.Name(city),
                    Species = Reader.Text(Reader.Call(city, "getFounderSpecies"), "id"),
                    Population = Reader.Int(Reader.Call(city, "getPopulationPeople")),
                    Army = Reader.Int(Reader.Call(city, "countWarriors")),
                    Loyalty = Reader.Int(Reader.Call(city, "getCachedLoyalty")),
                    Houses = Reader.Int(Reader.Call(city, "getHouseCurrent")),
                    Food = Reader.Int(Reader.Call(city, "getTotalFood")),
                    Coins = Reader.Int(Reader.Call(city, "countTotalMoney"))
                };

                HashSet<int> claimed = new HashSet<int>();
                foreach (object zone in Reader.Enumerate(Reader.Require(city, "zones")))
                {
                    if (zone == null || !claimed.Add(map.Index(zone))) throw new InvalidDataException("Duplicate or missing village zone: " + id);
                    object owner = Reader.Get(zone, "city");
                    if (owner != null && !ReferenceEquals(owner, city)) throw new InvalidDataException("Village and zone ownership disagree: " + id);
                }
                List<int> territory = new List<int>(claimed);
                territory.Sort();
                int bonfire = BonfireZone(world, city, map, territory);
                if (bonfire >= 0) territory.Remove(bonfire);
                entry.Territory.Add(bonfire);
                entry.Territory.AddRange(territory);

                foreach (object actor in Reader.Enumerate(Reader.Call(city, "getUnits")))
                {
                    if (actor != null && !Reader.Inactive(actor))
                    {
                        entry.Count(ActorSpecies(actor));
                    }
                }

                result.Add(entry);
            }

            result.Sort((a, b) => a.Id.CompareTo(b.Id));
        }

        private static void ReadCharacters(object world, AnnualRecord record, ISet<long> tracked, int year)
        {
            // Selection is applied only upon enrollment. Once a character has been
            // recorded, no later change of profession can remove that character.
            HashSet<long> ids = new HashSet<long>();
            HashSet<long> kingdoms = new HashSet<long>();
            HashSet<long> villages = new HashSet<long>();
            foreach (KingdomAnnual kingdom in record.Kingdoms) kingdoms.Add(kingdom.Id);
            foreach (VillageAnnual village in record.Villages) villages.Add(village.Id);

            foreach (object actor in Reader.Enumerate(Reader.Require(Reader.Require(world, "units"), "units_only_alive")))
            {
                if (actor == null || Reader.Inactive(actor)) continue;
                long id = Reader.Id(actor);
                bool alreadyTracked = tracked != null && tracked.Contains(id);
                object liveKingdom = Reader.Member(actor, "kingdom"), liveCity = Reader.Member(actor, "city");
                string role = CharacterRole(actor, liveKingdom, liveCity);
                bool eligible = role == "king" || role == "leader";
                if (!alreadyTracked && !eligible) continue;

                string species = ActorSpecies(actor);
                if (!alreadyTracked && species != "human" && species != "elf" && species != "orc" && species != "dwarf") continue;
                if (!ids.Add(id)) throw new InvalidDataException("Duplicate character ID: " + id);

                object actorData = Reader.Require(actor, "data");
                object birth = Reader.Require(actorData, "created_time");
                int birthYear = Date.getYear(Convert.ToSingle(birth, CultureInfo.InvariantCulture));
                if (birthYear > year) throw new InvalidDataException("Invalid character birthday: " + id);
                long? kingdomId = LiveId(liveKingdom);
                long? villageId = LiveId(liveCity);
                if (kingdomId.HasValue && !kingdoms.Contains(kingdomId.Value)) kingdomId = null;
                if (villageId.HasValue && !villages.Contains(villageId.Value)) villageId = null;

                CharacterAnnual entry = new CharacterAnnual
                {
                    Id = id,
                    Name = Reader.Name(actor),
                    Species = species,
                    Gender = Reader.Call(actor, "isSexMale") as bool? == true ? "male" : Reader.Call(actor, "isSexFemale") as bool? == true ? "female" : null,
                    BirthYear = birthYear,
                    KingdomId = kingdomId,
                    VillageId = villageId,
                    Role = role,
                    Level = Reader.Int(Reader.Require(actorData, "level")),
                    Coins = Reader.Int(Reader.Require(actorData, "money")),
                    Kills = Reader.Int(Reader.Require(actorData, "kills"))
                };

                long? parent1 = Reader.NullableId(Reader.Get(actorData, "parent_id_1"));
                long? parent2 = Reader.NullableId(Reader.Get(actorData, "parent_id_2"));
                if (parent1.HasValue) entry.ParentIds.Add(parent1.Value);
                if (parent2.HasValue && parent2 != parent1) entry.ParentIds.Add(parent2.Value);
                record.Characters.Add(entry);
            }
            record.Characters.Sort((a, b) => a.Id.CompareTo(b.Id));
        }

        private static long? LiveId(object value) { return value == null || Reader.Inactive(value) ? (long?)null : Reader.Id(value); }

        private static string CharacterRole(object actor, object kingdom, object city)
        {
            if (kingdom != null && ReferenceEquals(Reader.Member(kingdom, "king"), actor)) return "king";
            if (city != null && ReferenceEquals(Reader.Member(city, "leader"), actor)) return "leader";
            if (Reader.Call(actor, "get_is_army_captain") as bool? == true) return "captain";
            if (Reader.Call(actor, "get_is_profession_warrior") as bool? == true) return "warrior";
            if (Reader.Call(actor, "get_is_profession_citizen") as bool? == true) return "citizen";
            return null;
        }

        private static string ActorSpecies(object actor)
        {
            object subspecies = Reader.Get(actor, "subspecies");
            string species = Reader.TryCallString(subspecies, "get_species_id");

            if (string.IsNullOrEmpty(species))
            {
                species = Reader.Text(Reader.Get(subspecies, "data"), "species_id");
            }

            if (string.IsNullOrEmpty(species))
            {
                object asset = Reader.TryCall(actor, "getActorAsset") ?? Reader.Get(actor, "asset");
                species = Reader.Text(asset, "id");
            }

            return species;
        }

        private static void ReadWars(object world, List<WarAnnual> result)
        {
            object manager = Reader.Require(world, "wars");
            object active = Reader.TryCall(manager, "getActiveWars") ?? manager;
            HashSet<long> ids = new HashSet<long>();

            foreach (object war in Reader.Enumerate(active))
            {
                if (war == null || Reader.Inactive(war) || Reader.TryCall(war, "hasEnded") as bool? == true)
                {
                    continue;
                }

                long id = Reader.Id(war);

                if (!ids.Add(id))
                {
                    throw new InvalidDataException("Duplicate war ID: " + id);
                }

                object data = Reader.Get(war, "data");
                WarAnnual entry = new WarAnnual
                {
                    Id = id,
                    Name = Reader.Name(war),
                    WarType = Reader.Text(data, "war_type"),
                    Instigator = Reader.NullableId(Reader.Get(data, "started_by_kingdom_id")),
                    AttackerDeaths = Reader.Int(Reader.Call(war, "getDeadAttackers")),
                    DefenderDeaths = Reader.Int(Reader.Call(war, "getDeadDefenders"))
                };

                HashSet<long> participants = new HashSet<long>();
                ReadWarSide(war, "getAttackers", "attacker", entry.Participants, participants);
                ReadWarSide(war, "getDefenders", "defender", entry.Participants, participants);
                entry.Participants.Sort((a, b) => a.KingdomId.CompareTo(b.KingdomId));
                result.Add(entry);
            }

            result.Sort((a, b) => a.Id.CompareTo(b.Id));
        }

        private static void ReadWarSide(object war, string method, string side, List<WarParticipant> result, HashSet<long> seen)
        {
            foreach (object kingdom in Reader.Enumerate(Reader.Call(war, method)))
            {
                if (kingdom == null)
                {
                    continue;
                }

                long id = Reader.Id(kingdom);

                if (!seen.Add(id))
                {
                    throw new InvalidDataException("Kingdom on both sides of war: " + id);
                }

                result.Add(new WarParticipant { KingdomId = id, Side = side });
            }
        }

        private static void ReadAlliances(object world, List<AllianceState> result)
        {
            HashSet<long> ids = new HashSet<long>();

            foreach (object alliance in Reader.Enumerate(Reader.Require(world, "alliances")))
            {
                if (alliance == null || Reader.Inactive(alliance) || Reader.TryCall(alliance, "isReadyForRemoval") as bool? == true)
                {
                    continue;
                }

                long id = Reader.Id(alliance);

                if (!ids.Add(id))
                {
                    throw new InvalidDataException("Duplicate alliance ID: " + id);
                }

                AllianceState entry = new AllianceState { Id = id, Name = Reader.Name(alliance) };

                foreach (object kingdom in Reader.Enumerate(Reader.Require(alliance, "kingdoms_list")))
                {
                    if (kingdom != null && !Reader.Inactive(kingdom))
                    {
                        entry.Kingdoms.Add(Reader.Id(kingdom));
                    }
                }

                entry.Kingdoms.Sort();
                result.Add(entry);
            }

            result.Sort((a, b) => a.Id.CompareTo(b.Id));
        }
    }

    internal static class WorldIdentity
    {
        private const string Key = "historybox.world_guid";

        public static string GetOrCreate(object world, out bool created)
        {
            object stats = Reader.Require(world, "map_stats");
            object store = Reader.Require(stats, "custom_data");
            BindingFlags flags = BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic;
            MethodInfo get = store.GetType().GetMethod("get", flags, null, new Type[] { typeof(string), typeof(string).MakeByRefType(), typeof(string) }, null);
            MethodInfo set = store.GetType().GetMethod("set", flags, null, new Type[] { typeof(string), typeof(string) }, null);

            if (get == null || set == null)
            {
                throw new MissingMethodException("WorldBox custom-data get/set functions are unavailable.");
            }

            object[] args = { Key, null, "" };
            get.Invoke(store, args);
            string existing = args[1] as string;

            if (!string.IsNullOrWhiteSpace(existing))
            {
                Guid parsed;

                if (!Guid.TryParse(existing, out parsed))
                {
                    throw new InvalidDataException("Invalid HistoryBox world GUID: " + existing);
                }

                created = false;
                return parsed.ToString("N");
            }

            string id = Guid.NewGuid().ToString("N");
            set.Invoke(store, new object[] { Key, id });
            args = new object[] { Key, null, "" };
            get.Invoke(store, args);

            if (!string.Equals(args[1] as string, id, StringComparison.Ordinal))
            {
                throw new InvalidOperationException("Failed to persist HistoryBox world GUID.");
            }

            created = true;
            return id;
        }
    }

    internal static class Reader
    {
        private const BindingFlags Flags = BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.DeclaredOnly;

        private static readonly Dictionary<Type, Dictionary<string, MemberInfo>> members = new Dictionary<Type, Dictionary<string, MemberInfo>>();
        private static readonly Dictionary<Type, Dictionary<string, MethodInfo>> methods = new Dictionary<Type, Dictionary<string, MethodInfo>>();
        private static MemberInfo FindMember(Type source, string name)
        {
            Dictionary<string, MemberInfo> cache;
            if (!members.TryGetValue(source, out cache)) { cache = new Dictionary<string, MemberInfo>(); members.Add(source, cache); }
            MemberInfo member;
            if (cache.TryGetValue(name, out member)) return member;
            for (Type type = source; type != null; type = type.BaseType)
            {
                member = type.GetField(name, Flags);
                if (member == null) { PropertyInfo property = type.GetProperty(name, Flags); if (property != null && property.GetIndexParameters().Length == 0) member = property; }
                if (member != null) break;
            }
            cache.Add(name, member); return member;
        }
        private static MethodInfo FindMethod(Type type, string name, Type[] parameters)
        {
            Dictionary<string, MethodInfo> cache;
            if (!methods.TryGetValue(type, out cache)) { cache = new Dictionary<string, MethodInfo>(); methods.Add(type, cache); }
            string key = name + (parameters.Length == 0 ? "" : parameters.Length == 2 ? ":xy" : ":string");
            MethodInfo method;
            if (!cache.TryGetValue(key, out method)) { method = type.GetMethod(name, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic, null, parameters, null); cache.Add(key, method); }
            return method;
        }
        public static object Get(object source, string name)
        {
            if (source == null) return null;
            MemberInfo member = FindMember(source.GetType(), name);
            FieldInfo field = member as FieldInfo;
            return field != null ? field.GetValue(source) : member is PropertyInfo ? ((PropertyInfo)member).GetValue(source, null) : null;
        }
        public static object Member(object source, string name)
        {
            if (source == null || FindMember(source.GetType(), name) == null) throw new MissingMemberException(source == null ? "null" : source.GetType().Name, name);
            return Get(source, name);
        }

        public static object Require(object source, string name)
        {
            object value = Get(source, name);

            if (value == null)
            {
                throw new MissingMemberException(source == null ? "null" : source.GetType().Name, name);
            }

            return value;
        }

        public static object Call(object source, string method)
        {
            if (source == null)
            {
                throw new InvalidOperationException("Cannot call " + method + " on null.");
            }

            MethodInfo info = FindMethod(source.GetType(), method, Type.EmptyTypes);

            if (info == null)
            {
                throw new MissingMethodException(source.GetType().Name, method);
            }

            return info.Invoke(source, null);
        }

        public static object CallXY(object source, string method, int x, int y)
        {
            if (source == null) throw new InvalidOperationException("Cannot call " + method + " on null.");
            MethodInfo info = FindMethod(source.GetType(), method, new Type[] { typeof(int), typeof(int) });
            if (info == null) throw new MissingMethodException(source.GetType().Name, method);
            return info.Invoke(source, new object[] { x, y });
        }

        public static object CallString(object source, string method, string value)
        {
            if (source == null) throw new InvalidOperationException("Cannot call " + method + " on null.");
            MethodInfo info = FindMethod(source.GetType(), method, new Type[] { typeof(string) });
            if (info == null) throw new MissingMethodException(source.GetType().Name, method);
            return info.Invoke(source, new object[] { value });
        }

        public static object TryCall(object source, string method)
        {
            if (source == null)
            {
                return null;
            }

            MethodInfo info = FindMethod(source.GetType(), method, Type.EmptyTypes);
            return info == null ? null : info.Invoke(source, null);
        }

        public static string Text(object source, string name)
        {
            object value = Get(source, name);
            return value == null ? null : Convert.ToString(value, CultureInfo.InvariantCulture);
        }

        public static string TryCallString(object source, string method)
        {
            object value = TryCall(source, method);
            return value == null ? null : Convert.ToString(value, CultureInfo.InvariantCulture);
        }

        public static string First(params string[] values)
        {
            foreach (string value in values)
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value;
                }
            }

            return null;
        }

        public static bool Inactive(object source)
        {
            object exists = Get(source, "exists");
            return exists is bool && !(bool)exists;
        }

        public static int Int(object value)
        {
            if (value == null) throw new InvalidDataException("Missing numeric WorldBox measurement.");
            return Convert.ToInt32(value, CultureInfo.InvariantCulture);
        }

        public static long Id(object source)
        {
            object data = Get(source, "data");
            object value = Get(data, "id") ?? Get(source, "id") ?? TryCall(source, "getID");

            if (value == null)
            {
                throw new InvalidDataException("WorldBox entity lacks an ID: " + source.GetType().Name);
            }

            return Convert.ToInt64(value, CultureInfo.InvariantCulture);
        }

        public static long? NullableId(object value)
        {
            if (value == null)
            {
                return null;
            }

            string text = Convert.ToString(value, CultureInfo.InvariantCulture);
            long id;
            return long.TryParse(text, NumberStyles.Integer, CultureInfo.InvariantCulture, out id) && id > 0 ? (long?)id : null;
        }

        public static string Name(object source)
        {
            return First(Text(Get(source, "data"), "name"), Text(source, "name"), TryCallString(source, "getName"));
        }

        public static IEnumerable Enumerate(object source)
        {
            IEnumerable list = source as IEnumerable;

            if (list == null)
            {
                throw new InvalidOperationException("Cannot enumerate WorldBox object " + (source == null ? "null" : source.GetType().Name));
            }

            return list;
        }

        public static string Localize(string key)
        {
            if (string.IsNullOrEmpty(key))
            {
                return null;
            }

            try
            {
                MethodInfo method = typeof(LocalizedTextManager).GetMethod("getText", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static);

                if (method == null)
                {
                    return null;
                }

                ParameterInfo[] parameters = method.GetParameters();

                if (parameters.Length != 3)
                {
                    return null;
                }

                string result = method.Invoke(null, new object[] { key, null, false }) as string;
                return result == key ? null : result;
            }
            catch
            {
                return null;
            }
        }
    }

    internal sealed class HistorySession
    {
        private string directory;
        private MetadataRecord metadata;
        private int[] committedElevation;
        public string WorldId { get; private set; }
        public int? Slot { get; private set; }
        public int LastYear { get; private set; }
        public ISet<long> TrackedCharacterIds
        {
            get
            {
                EnsureRecovered();
                HashSet<long> result = new HashSet<long>();
                foreach (CharacterMetadata character in metadata.Characters) result.Add(character.Id);
                return result;
            }
        }

        public HistorySession(string worldId, string worldName, int? slot)
        {
            WorldId = worldId;
            directory = HistoryStorage.FindOrCreate(worldId, worldName, slot);
            metadata = HistoryStorage.LoadMetadata(directory);

            if (metadata.World.Id != null && metadata.World.Id != worldId)
            {
                throw new InvalidDataException("HistoryBox world GUID mismatch.");
            }

            if (metadata.World.Id != null && metadata.World.Slot != slot)
            {
                throw new InvalidDataException("HistoryBox save slot mismatch.");
            }

            Slot = slot;
            LastYear = HistoryStorage.GetLastYear(directory);
            if (LastYear >= 0) committedElevation = HistoryStorage.LoadElevation(directory, metadata.Map, LastYear);

            if (metadata.World.Id == null)
            {
                metadata.World.Id = worldId;
                metadata.World.Name = worldName;
                metadata.World.Slot = slot;
                HistoryStorage.SaveMetadata(directory, metadata);
            }
        }

        private HistorySession()
        {
        }

        private void EnsureRecovered()
        {
            if (!HistoryStorage.Recover(directory)) return;
            metadata = HistoryStorage.LoadMetadata(directory);
            LastYear = metadata.World.Year;
            committedElevation = LastYear < 0 ? null : HistoryStorage.LoadElevation(directory, metadata.Map, LastYear);
        }
        public void Record(AnnualRecord record)
        {
            EnsureRecovered();
            long timing = Performance.Begin();
            WorldReader.Validate(record);
            if (record.World.Year <= LastYear)
            {
                return;
            }

            MetadataRecord candidate = HistoryStorage.Clone(metadata);
            candidate.Update(record, LastYear);
            record.Map.Clear();
            if (committedElevation != null)
            {
                if (committedElevation.Length != record.Elevation.Count) throw new InvalidDataException("Previously committed map size changed.");
                for (int i = 0; i < committedElevation.Length; i++)
                {
                    if (committedElevation[i] != record.Elevation[i]) record.Map.Add(new int[] { i, record.Elevation[i] });
                }
            }
            candidate.World.Year = record.World.Year;
            Performance.End("prepare", timing);
            HistoryStorage.Commit(directory, candidate, record, null, LastYear);
            metadata = candidate;
            committedElevation = record.Elevation.ToArray();
            LastYear = record.World.Year;
        }

        public void AssignSlot(int slot)
        {
            if (Slot.HasValue)
            {
                return;
            }

            EnsureRecovered();
            string target = HistoryStorage.GetAvailableDirectory(metadata.World.Name, slot);
            MetadataRecord candidate = HistoryStorage.Clone(metadata);
            candidate.World.Slot = slot;
            HistoryStorage.Commit(target, candidate, null, directory);
            directory = target;
            metadata = candidate;
            Slot = slot;
        }

        public HistorySession Duplicate(int slot, int year)
        {
            EnsureRecovered();
            string target = HistoryStorage.GetAvailableDirectory(metadata.World.Name, slot);
            MetadataRecord copy = HistoryStorage.Clone(metadata);
            copy.World.Slot = slot;
            copy.Trim(year);
            copy.World.Year = HistoryStorage.GetLastYear(directory, year);
            copy.RetainRecordedCharacters(HistoryStorage.GetRecordedCharacters(directory, copy.World.Year));
            HistoryStorage.Commit(target, copy, null, directory);

            return new HistorySession
            {
                WorldId = WorldId,
                Slot = slot,
                LastYear = HistoryStorage.GetLastYear(target),
                directory = target,
                metadata = copy,
                committedElevation = HistoryStorage.LoadElevation(target, copy.Map, copy.World.Year)
            };
        }
    }

    internal sealed class SaveSlotTracker
    {
        private sealed class FileState
        {
            public long Length;
            public DateTime Modified;
            public float ChangedAt;
            public bool Pending;
        }

        private readonly string root;
        private readonly Dictionary<int, FileState> states = new Dictionary<int, FileState>();
        private float nextCheck;

        public SaveSlotTracker()
        {
            string example = GetSlotFile(1);
            root = Path.GetDirectoryName(Path.GetDirectoryName(example));
            Scan(true);
        }

        public static int? GetLoadedSlot()
        {
            int slot = ReadCurrentSlot();
            return slot >= 0 && File.Exists(GetSlotFile(slot)) ? (int?)slot : null;
        }

        public int? Update()
        {
            if (Time.unscaledTime < nextCheck)
            {
                return null;
            }

            nextCheck = Time.unscaledTime + 0.25f;
            return Scan(false);
        }

        private int? Scan(bool baseline)
        {
            if (!Directory.Exists(root))
            {
                return null;
            }

            foreach (string folder in Directory.GetDirectories(root, "save*"))
            {
                string name = Path.GetFileName(folder);
                int slot;

                if (!name.StartsWith("save", StringComparison.OrdinalIgnoreCase) || !int.TryParse(name.Substring(4), out slot) || slot < 0)
                {
                    continue;
                }

                string path = GetSlotFile(slot);

                if (!File.Exists(path))
                {
                    states.Remove(slot);
                    continue;
                }

                FileInfo file = new FileInfo(path);
                FileState state;

                if (!states.TryGetValue(slot, out state))
                {
                    states.Add(slot, new FileState
                    {
                        Length = file.Length,
                        Modified = file.LastWriteTimeUtc,
                        ChangedAt = Time.unscaledTime,
                        Pending = !baseline
                    });

                    continue;
                }

                if (state.Length != file.Length || state.Modified != file.LastWriteTimeUtc)
                {
                    state.Length = file.Length;
                    state.Modified = file.LastWriteTimeUtc;
                    state.ChangedAt = Time.unscaledTime;
                    state.Pending = true;
                    continue;
                }

                if (state.Pending && Time.unscaledTime - state.ChangedAt >= 1f)
                {
                    state.Pending = false;

                    if (ReadCurrentSlot() == slot)
                    {
                        return slot;
                    }
                }
            }

            return null;
        }

        private static int ReadCurrentSlot()
        {
            object value = GetSaveManagerMember("currentSlot");
            return value == null ? -1 : Convert.ToInt32(value, CultureInfo.InvariantCulture);
        }

        private static string GetSlotFile(int slot)
        {
            MethodInfo method = typeof(SaveManager).GetMethod("getSlotPathWbox", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static | BindingFlags.Instance, null, new Type[] { typeof(int) }, null);

            if (method == null)
            {
                throw new MissingMethodException("SaveManager", "getSlotPathWbox");
            }

            object instance = method.IsStatic ? null : GetSaveManagerInstance();
            string path = method.Invoke(instance, new object[] { slot }) as string;

            if (string.IsNullOrWhiteSpace(path))
            {
                throw new InvalidDataException("Invalid WorldBox save path.");
            }

            return path;
        }

        private static object GetSaveManagerMember(string name)
        {
            Type type = typeof(SaveManager);
            BindingFlags flags = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static | BindingFlags.Instance;
            FieldInfo field = type.GetField(name, flags);

            if (field != null)
            {
                return field.GetValue(field.IsStatic ? null : GetSaveManagerInstance());
            }

            PropertyInfo property = type.GetProperty(name, flags);

            if (property != null)
            {
                MethodInfo getter = property.GetGetMethod(true);
                return property.GetValue(getter.IsStatic ? null : GetSaveManagerInstance(), null);
            }

            return null;
        }

        private static object GetSaveManagerInstance()
        {
            Type type = typeof(SaveManager);
            BindingFlags flags = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static;

            foreach (string name in new string[] { "instance", "current" })
            {
                FieldInfo field = type.GetField(name, flags);

                if (field != null)
                {
                    return field.GetValue(null);
                }

                PropertyInfo property = type.GetProperty(name, flags);

                if (property != null)
                {
                    return property.GetValue(null, null);
                }
            }

            throw new InvalidOperationException("Cannot locate SaveManager instance.");
        }
    }

    internal static class HistoryStorage
    {
        private static string GetRoot()
        {
            return Path.Combine(Application.persistentDataPath, "HistoryBox");
        }

        public static string FindOrCreate(string id, string worldName, int? slot)
        {
            string root = GetRoot();
            Directory.CreateDirectory(root);
            string match = null;

            foreach (string folder in Directory.GetDirectories(root))
            {
                Recover(folder);
                if (!File.Exists(MetadataPath(folder)))
                {
                    continue;
                }

                MetadataRecord existing = LoadMetadata(folder);

                if (existing.World.Id == id && existing.World.Slot == slot)
                {
                    if (match != null)
                    {
                        throw new InvalidDataException("Duplicate HistoryBox world and slot association.");
                    }

                    match = folder;
                }
            }

            return match ?? GetAvailableDirectory(worldName, slot);
        }

        public static string GetAvailableDirectory(string worldName, int? slot)
        {
            string root = GetRoot();
            Directory.CreateDirectory(root);
            string name = Sanitize(worldName);

            if (name == null)
            {
                int index = 0;

                while (true)
                {
                    string candidate = Path.Combine(root, "HistoryBox_" + index.ToString(CultureInfo.InvariantCulture));

                    if (!Directory.Exists(candidate) && !File.Exists(candidate))
                    {
                        return candidate;
                    }

                    index++;
                }
            }

            string baseName = slot.HasValue ? name + "_slot" + slot.Value.ToString(CultureInfo.InvariantCulture) : name + "_";
            string path = Path.Combine(root, baseName);

            if (!Directory.Exists(path) && !File.Exists(path))
            {
                return path;
            }

            int suffix = 1;

            while (true)
            {
                string candidate = Path.Combine(root, baseName + (baseName.EndsWith("_") ? "" : "_") + suffix.ToString(CultureInfo.InvariantCulture));

                if (!Directory.Exists(candidate) && !File.Exists(candidate))
                {
                    return candidate;
                }

                suffix++;
            }
        }

        private static string Sanitize(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                return null;
            }

            StringBuilder result = new StringBuilder();
            char[] invalid = Path.GetInvalidFileNameChars();

            foreach (char character in name.Trim().ToLowerInvariant())
            {
                result.Append(char.IsWhiteSpace(character) || Array.IndexOf(invalid, character) >= 0 ? '_' : character);
            }

            string value = result.ToString().TrimEnd('.');

            if (value.Length > 100)
            {
                value = value.Substring(0, 100).TrimEnd('.');
            }

            if (value.Length == 0)
            {
                return null;
            }

            string device = value.Split('.')[0].ToUpperInvariant();

            if (device == "CON" || device == "PRN" || device == "AUX" || device == "NUL" || (device.Length == 4 && (device.StartsWith("COM") || device.StartsWith("LPT")) && device[3] >= '1' && device[3] <= '9'))
            {
                value = "_" + value;
            }

            return value;
        }

        private static string MetadataPath(string directory)
        {
            return Path.Combine(directory, "overview.json");
        }

        private static string AnnualPath(string directory)
        {
            return Path.Combine(directory, "annual.jsonl");
        }

        public static MetadataRecord LoadMetadata(string directory)
        {
            Recover(directory);
            string path = MetadataPath(directory);

            if (!File.Exists(path))
            {
                return new MetadataRecord();
            }

            using (FileStream stream = File.OpenRead(path))
            {
                MetadataRecord result = new DataContractJsonSerializer(typeof(MetadataRecord)).ReadObject(stream) as MetadataRecord;

                if (result == null)
                {
                    throw new InvalidDataException("HistoryBox metadata is invalid.");
                }
                if (result.Characters == null) result.Characters = new List<CharacterMetadata>();
                if (result.World.Year >= 0) ValidateMap(result.Map);

                foreach (CharacterMetadata character in result.Characters)
                {
                    if (character.Parents == null) character.Parents = new List<long>();
                    if (character.Siblings == null) character.Siblings = new List<long>();
                    if (character.Children == null) character.Children = new List<long>();
                }

                string annual = AnnualPath(directory);
                if (!File.Exists(annual) && result.World.Year >= 0) throw new InvalidDataException("HistoryBox annual observations are missing.");
                if (File.Exists(annual))
                {
                    using (StreamReader reader = File.OpenText(annual))
                    {
                        string first = reader.ReadLine();
                        AnnualHeader header = string.IsNullOrWhiteSpace(first) ? null : Deserialize<AnnualHeader>(first);
                        if (!SameIdentity(header, result.World)) throw new InvalidDataException("HistoryBox file metadata mismatch.");
                    }
                    if (GetLastYear(directory) != result.World.Year) throw new InvalidDataException("HistoryBox last-year mismatch.");
                }
                return result;
            }
        }

        public static void ValidateMap(MapMetadata map)
        {
            if (map == null || map.Width <= 0 || map.Height <= 0 || map.Elevation == null || (long)map.Width * map.Height != map.Elevation.Count) throw new InvalidDataException("Invalid map baseline or incompatible history format.");
            foreach (int value in map.Elevation) if (value < 0 || value > 3) throw new InvalidDataException("Invalid baseline terrain category.");
        }

        public static int[] LoadElevation(string directory, MapMetadata map, int maximum)
        {
            if (maximum < 0) return null;
            ValidateMap(map);
            int[] elevation = map.Elevation.ToArray();
            bool header = false;
            int previous = -1;
            foreach (string line in File.ReadLines(AnnualPath(directory)))
            {
                if (string.IsNullOrWhiteSpace(line)) continue;
                if (!header) { header = true; continue; }
                AnnualRecord observation = Deserialize<AnnualRecord>(line);
                if (observation.World == null || observation.World.Year <= previous) throw new InvalidDataException("Invalid map-observation sequence.");
                bool first = previous < 0;
                if (observation.World.Year > maximum) break;
                previous = observation.World.Year;
                if (observation.Map == null) throw new InvalidDataException("Missing annual map changes.");
                if (first && observation.Map.Count != 0) throw new InvalidDataException("First annual map must match the baseline.");
                int priorIndex = -1;
                foreach (int[] change in observation.Map)
                {
                    if (change == null || change.Length != 2 || change[0] <= priorIndex || change[0] >= elevation.Length || change[1] < 0 || change[1] > 3) throw new InvalidDataException("Invalid annual terrain change.");
                    elevation[change[0]] = change[1];
                    priorIndex = change[0];
                }
            }
            if (!header || previous != maximum) throw new InvalidDataException("Incomplete annual map observations.");
            return elevation;
        }

        // Startup reads only the final complete line. Full traversal is reserved
        // for an explicit historical cutoff used by duplication.
        private static int GetYearAtLength(string path, long length)
        {
            using (FileStream stream = File.OpenRead(path))
            {
                if (length <= 0 || length > stream.Length) throw new InvalidDataException("Invalid annual file length.");
                stream.Position = length - 1;
                if (stream.ReadByte() != 10) throw new InvalidDataException("Incomplete annual append without a ready journal.");
                List<byte> reversed = new List<byte>(); byte[] block = new byte[4096]; long position = length; bool started = false, done = false;
                while (position > 0 && !done)
                {
                    int count = (int)Math.Min(block.Length, position); position -= count; stream.Position = position;
                    int read = 0; while (read < count) { int n = stream.Read(block, read, count - read); if (n == 0) throw new EndOfStreamException(); read += n; }
                    for (int i = count - 1; i >= 0; i--)
                    {
                        byte value = block[i]; if (!started && (value == 10 || value == 13)) continue;
                        if (value == 10) { done = true; break; } started = true; reversed.Add(value);
                    }
                }
                reversed.Reverse(); string line = new UTF8Encoding(false, true).GetString(reversed.ToArray());
                YearProbe record = Deserialize<YearProbe>(line);
                if (record.World != null) return record.World.Year;
                AnnualHeader header = Deserialize<AnnualHeader>(line);
                if (header == null || header.Metadata == null) throw new InvalidDataException("Missing annual metadata header.");
                return -1;
            }
        }
        public static int GetLastYear(string directory, int maximum = int.MaxValue)
        {
            string path = AnnualPath(directory); if (!File.Exists(path)) return -1;
            if (maximum == int.MaxValue) return GetYearAtLength(path, new FileInfo(path).Length);
            int year = -1; bool header = false;
            foreach (string line in File.ReadLines(path))
            {
                if (string.IsNullOrWhiteSpace(line)) continue;
                if (!header) { if (Deserialize<AnnualHeader>(line).Metadata == null) throw new InvalidDataException("Missing annual metadata header."); header = true; continue; }
                YearProbe record = Deserialize<YearProbe>(line);
                if (record.World == null || record.World.Year <= year) throw new InvalidDataException("Invalid annual year order.");
                if (record.World.Year > maximum) break;
                year = record.World.Year;
            }
            return year;
        }

        // Birth-year start dates may precede first enrollment. For duplication,
        // consult annual observations rather than treating birth as enrollment.
        public static HashSet<long> GetRecordedCharacters(string directory, int lastYear)
        {
            HashSet<long> ids = new HashSet<long>();
            if (lastYear < 0 || !File.Exists(AnnualPath(directory))) return ids;
            foreach (string line in File.ReadLines(AnnualPath(directory)))
            {
                if (string.IsNullOrWhiteSpace(line)) continue;
                AnnualRecord record = Deserialize<AnnualRecord>(line);
                if (record.World == null) continue;
                if (record.World.Year > lastYear) break;
                if (record.Characters == null) continue;
                foreach (CharacterAnnual character in record.Characters) ids.Add(character.Id);
            }
            return ids;
        }

        [DataContract]
        private sealed class StreamIdentity : IExtensibleDataObject
        {
            public ExtensionDataObject ExtensionData { get; set; }
            [DataMember(Name = "id", Order = 1)] public string Id;
            [DataMember(Name = "slot", Order = 2)] public int? Slot;
        }
        [DataContract]
        private sealed class AnnualHeader : IExtensibleDataObject
        {
            public ExtensionDataObject ExtensionData { get; set; }
            [DataMember(Name = "metadata", Order = 1)] public StreamIdentity Metadata;
        }
        [DataContract]
        private sealed class YearProbe
        {
            [DataMember(Name = "world")] public YearValue World { get; set; }
        }
        [DataContract]
        private sealed class YearValue
        {
            [DataMember(Name = "year", IsRequired = true)] public int Year { get; set; }
        }
        [DataContract]
        private sealed class CommitJournal
        {
            [DataMember] public string Mode;
            [DataMember] public long PreviousLength;
            [DataMember] public int PreviousYear;
            [DataMember] public int Year;
        }
        private static AnnualHeader Header(WorldMetadata world)
        {
            return new AnnualHeader { Metadata = new StreamIdentity { Id = world.Id, Slot = world.Slot } };
        }
        private static bool SameIdentity(AnnualHeader header, WorldMetadata world)
        {
            return header != null && header.Metadata != null && header.Metadata.Id == world.Id && header.Metadata.Slot == world.Slot && Serialize(header) == Serialize(Header(world));
        }
        public static MetadataRecord Clone(MetadataRecord value) { return Deserialize<MetadataRecord>(Serialize(value)); }

        // Routine recording journals just one line and the proposed overview. New
        // streams (initial creation, slot assignment, duplication) alone copy history.
        public static void Commit(string directory, MetadataRecord overview, AnnualRecord next, string sourceDirectory = null, int? previousYear = null)
        {
            long timing = Performance.Begin();
            Directory.CreateDirectory(directory);
            Recover(directory);
            string staging = Path.Combine(directory, "commit.pending");
            ClearStaging(staging);
            Directory.CreateDirectory(staging);
            string annual = AnnualPath(directory);
            CommitJournal journal = new CommitJournal { Year = overview.World.Year, PreviousLength = File.Exists(annual) ? new FileInfo(annual).Length : 0, PreviousYear = previousYear ?? GetLastYear(directory) };
            if (sourceDirectory != null || !File.Exists(annual))
            {
                journal.Mode = "stream";
                string source = sourceDirectory == null ? null : AnnualPath(sourceDirectory);
                using (StreamWriter writer = new StreamWriter(AnnualPath(staging), false, new UTF8Encoding(false)))
                {
                    writer.WriteLine(Serialize(Header(overview.World)));
                    int prior = -1;
                    if (source != null && File.Exists(source))
                    {
                        bool first = true;
                        foreach (string line in File.ReadLines(source))
                        {
                            if (string.IsNullOrWhiteSpace(line)) continue;
                            if (first) { first = false; continue; }
                            YearProbe old = Deserialize<YearProbe>(line);
                            if (old.World == null || old.World.Year <= prior) throw new InvalidDataException("Invalid source history order.");
                            if (old.World.Year > overview.World.Year) break;
                            prior = old.World.Year; writer.WriteLine(line);
                        }
                    }
                    if (next != null) { if (next.World.Year <= prior) throw new InvalidDataException("Repeated annual observation."); writer.WriteLine(Serialize(next)); }
                    writer.Flush(); ((FileStream)writer.BaseStream).Flush(true);
                }
                if (GetLastYear(staging) != overview.World.Year) throw new InvalidDataException("New stream and overview years disagree.");
            }
            else
            {
                using (StreamReader reader = File.OpenText(annual)) if (!SameIdentity(Deserialize<AnnualHeader>(reader.ReadLine()), overview.World)) throw new InvalidDataException("Annual stream identity cannot change.");
                journal.Mode = next == null ? "metadata" : "append";
                if (next != null)
                {
                    if (next.World.Year != overview.World.Year || next.World.Year <= journal.PreviousYear) throw new InvalidDataException("Invalid next annual year.");
                    WriteDurable(Path.Combine(staging, "append.jsonl"), Serialize(next) + "\n");
                }
                else if (overview.World.Year != journal.PreviousYear) throw new InvalidDataException("Metadata-only commit cannot change year.");
            }
            WriteDurable(MetadataPath(staging), FormatMetadata(Serialize(overview)));
            WriteDurable(Path.Combine(staging, "journal.json"), Serialize(journal));
            WriteDurable(Path.Combine(staging, "ready"), "ready");
            Performance.End("stage", timing);
            Recover(directory);
        }
        public static void SaveMetadata(string directory, MetadataRecord record) { Commit(directory, record, null); }
        private static void WriteDurable(string path, string text)
        {
            using (FileStream stream = new FileStream(path, FileMode.Create, FileAccess.Write, FileShare.None))
            {
                byte[] bytes = new UTF8Encoding(false).GetBytes(text);
                stream.Write(bytes, 0, bytes.Length); stream.Flush(true);
            }
        }
        private static void Publish(string source, string target)
        {
            string temporary = target + ".tmp";
            File.Copy(source, temporary, true);
            using (FileStream stream = new FileStream(temporary, FileMode.Open, FileAccess.Write, FileShare.None)) stream.Flush(true);
            if (File.Exists(target)) File.Replace(temporary, target, null); else File.Move(temporary, target);
        }
        private static void ClearStaging(string staging)
        {
            if (!Directory.Exists(staging)) return;
            foreach (string name in new[] { "annual.jsonl", "overview.json", "append.jsonl", "journal.json" })
            {
                string path = Path.Combine(staging, name); if (File.Exists(path)) File.Delete(path);
            }
            Directory.Delete(staging); // Never recursively remove an unknown path or file.
        }
        public static bool Recover(string directory)
        {
            string staging = Path.Combine(directory, "commit.pending"), ready = Path.Combine(staging, "ready");
            if (!File.Exists(ready)) return false;
            long timing = Performance.Begin();
            CommitJournal journal = Deserialize<CommitJournal>(File.ReadAllText(Path.Combine(staging, "journal.json")));
            MetadataRecord overview = Deserialize<MetadataRecord>(File.ReadAllText(MetadataPath(staging)));
            if (journal == null || overview.World == null || journal.Year != overview.World.Year) throw new InvalidDataException("Invalid pending history commit.");
            string annual = AnnualPath(directory);
            if (journal.Mode == "stream")
            {
                if (GetLastYear(staging) != journal.Year) throw new InvalidDataException("Pending stream year mismatch.");
                using (StreamReader reader = File.OpenText(AnnualPath(staging))) if (!SameIdentity(Deserialize<AnnualHeader>(reader.ReadLine()), overview.World)) throw new InvalidDataException("Pending stream identity mismatch.");
                Publish(AnnualPath(staging), annual);
            }
            else if (journal.Mode == "append" || journal.Mode == "metadata")
            {
                using (StreamReader reader = File.OpenText(annual)) if (!SameIdentity(Deserialize<AnnualHeader>(reader.ReadLine()), overview.World)) throw new InvalidDataException("Pending append identity mismatch.");
                if (journal.PreviousLength <= 0 || GetYearAtLength(annual, journal.PreviousLength) != journal.PreviousYear) throw new InvalidDataException("Pending append base year mismatch.");
                if (journal.Mode == "append")
                {
                    byte[] bytes = File.ReadAllBytes(Path.Combine(staging, "append.jsonl"));
                    YearProbe next = Deserialize<YearProbe>(Encoding.UTF8.GetString(bytes));
                    if (bytes.Length == 0 || bytes[bytes.Length - 1] != 10 || next.World == null || next.World.Year != journal.Year || journal.Year <= journal.PreviousYear) throw new InvalidDataException("Invalid pending annual line.");
                    using (FileStream stream = new FileStream(annual, FileMode.Open, FileAccess.ReadWrite, FileShare.None))
                    {
                        long suffix = stream.Length - journal.PreviousLength;
                        if (suffix < 0 || suffix > bytes.Length) throw new InvalidDataException("Annual file changed outside pending commit.");
                        stream.Position = journal.PreviousLength;
                        for (int i = 0; i < suffix; i++) if (stream.ReadByte() != bytes[i]) throw new InvalidDataException("Pending annual suffix disagrees with journal.");
                        if (suffix != bytes.Length) { stream.SetLength(journal.PreviousLength); stream.Position = journal.PreviousLength; stream.Write(bytes, 0, bytes.Length); }
                        stream.Flush(true);
                    }
                }
                else if (new FileInfo(annual).Length != journal.PreviousLength || journal.Year != journal.PreviousYear) throw new InvalidDataException("Invalid metadata-only commit.");
            }
            else throw new InvalidDataException("Unknown pending history operation.");
            Publish(MetadataPath(staging), MetadataPath(directory));
            File.Delete(ready); // Both files are durable before removing the replay marker.
            try { ClearStaging(staging); } catch (IOException) { } catch (UnauthorizedAccessException) { }
            Performance.End("publish", timing);
            return true;
        }

        private static string FormatMetadata(string json)
        {
            StringBuilder result = new StringBuilder();
            int depth = 0;
            bool quote = false;
            bool escape = false;

            foreach (char c in json)
            {
                if (quote)
                {
                    result.Append(c);

                    if (escape)
                    {
                        escape = false;
                    }
                    else if (c == '\\')
                    {
                        escape = true;
                    }
                    else if (c == '"')
                    {
                        quote = false;
                    }

                    continue;
                }

                if (c == '"')
                {
                    quote = true;
                    result.Append(c);
                }
                else if (c == '{' || c == '[')
                {
                    result.Append(c);
                    depth++;

                    if (depth == 1)
                    {
                        result.Append("\n  ");
                    }
                }
                else if (c == '}' || c == ']')
                {
                    if (depth == 1)
                    {
                        result.Append('\n');
                    }

                    depth--;
                    result.Append(c);
                }
                else if (c == ',' && depth == 1)
                {
                    result.Append(",\n  ");
                }
                else
                {
                    result.Append(c);
                }
            }

            return result.ToString();
        }

        private static string Serialize<T>(T value)
        {
            using (MemoryStream stream = new MemoryStream())
            {
                new DataContractJsonSerializer(typeof(T)).WriteObject(stream, value);
                return Encoding.UTF8.GetString(stream.ToArray());
            }
        }

        private static T Deserialize<T>(string json)
        {
            using (MemoryStream stream = new MemoryStream(Encoding.UTF8.GetBytes(json)))
            {
                return (T)new DataContractJsonSerializer(typeof(T)).ReadObject(stream);
            }
        }
    }
}
