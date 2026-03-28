import Order "mo:core/Order";
import Array "mo:core/Array";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";

import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import AccessControl "authorization/access-control";

actor {
  module IdGenerator {
    public type State = {
      var nextId : Nat;
    };
  };

  func compareByOrder<T>(extractOrder : T -> Nat) : (T, T) -> Order.Order {
    func(a, b) { Nat.compare(extractOrder(a), extractOrder(b)) };
  };

  func compareByPublishedAt<T>(extractPublishedAt : T -> Int) : (T, T) -> Order.Order {
    func(a, b) { Int.compare(extractPublishedAt(a), extractPublishedAt(b)) };
  };

  func compareByEventDateTime<T>(extractEventDateTime : T -> Int) : (T, T) -> Order.Order {
    func(a, b) { Int.compare(extractEventDateTime(a), extractEventDateTime(b)) };
  };

  public type Image = Storage.ExternalBlob;

  // Church Model and API
  public type Church = {
    id : Nat;
    nameAr : Text;
    nameEn : Text;
    addressAr : Text;
    addressEn : Text;
    phone : Text;
    descriptionAr : Text;
    descriptionEn : Text;
    latitude : Float;
    longitude : Float;
    imageUrl : ?Text;
    image : ?Image;
  };

  // Events Model
  public type Event = {
    id : Nat;
    titleAr : Text;
    titleEn : Text;
    descriptionAr : Text;
    descriptionEn : Text;
    dateTime : Int;
    locationAr : Text;
    locationEn : Text;
    imageUrl : ?Text;
    calendarLink : ?Text;
    image : ?Image;
    isPublished : Bool;
    createdAt : Int;
  };

  // EducationPost Model
  public type EducationPost = {
    id : Nat;
    titleAr : Text;
    titleEn : Text;
    contentAr : Text;
    contentEn : Text;
    mediaUrls : [Text];
    postType : {
      #video;
      #photo;
      #text;
    };
    publishedAt : Int;
    authorName : Text;
    image : ?Image;
    isPublished : Bool;
  };

  // VisionContent Model
  public type VisionContents = {
    sectionKey : Text;
    titleAr : Text;
    titleEn : Text;
    bodyAr : Text;
    bodyEn : Text;
    order : Nat;
  };

  // Team Model
  public type Team = {
    id : Nat;
    nameAr : Text;
    nameEn : Text;
    descriptionAr : Text;
    descriptionEn : Text;
    mediaUrls : [Text];
    category : TeamsCategory;
    order : Nat;
  };

  public type TeamsCategory = {
    #choir;
    #youth;
    #kids;
    #volunteers;
    #ministry;
  };

  public type Reference = {
    id : Nat;
    titleAr : Text;
    titleEn : Text;
    fileUrl : Text;
  };

  public type AboutApp = {
    id : Nat;
    contentAr : Text;
    contentEn : Text;
  };

  public type SocialMediaLink = {
    id : Nat;
    platform : Text;
    url : Text;
    iconUrl : Text;
  };

  public type ContactInfo = {
    id : Nat;
    phone : Text;
    email : Text;
    addressAr : Text;
    addressEn : Text;
  };

  public type Setting = {
    id : Nat;
    key : Text;
    value : Text;
  };

  public type HeroVideo = {
    id : Nat;
    titleAr : Text;
    titleEn : Text;
    videoUrl : Text;
    thumbnailUrl : Text;
  };

  public type UserProfile = {
    name : Text;
  };

  let state = {
    var churchIdGen = { var nextId = 1 };
    var eventIdGen = { var nextId = 1 };
    var eduPostIdGen = { var nextId = 1 };
    var teamIdGen = { var nextId = 1 };
    var referenceIdGen = { var nextId = 1 };
    var aboutAppIdGen = { var nextId = 1 };
    var socialMediaIdGen = { var nextId = 1 };
    var contactIdGen = { var nextId = 1 };
    var settingIdGen = { var nextId = 1 };
    var heroVideoIdGen = { var nextId = 1 };

    var churches = Map.empty<Nat, Church>();
    var events = Map.empty<Nat, Event>();
    var educationPosts = Map.empty<Nat, EducationPost>();
    var visionContent = Map.empty<Text, VisionContents>();
    var teams = Map.empty<Nat, Team>();
    var references = Map.empty<Nat, Reference>();
    var aboutApps = Map.empty<Nat, AboutApp>();
    var socialMediaLinks = Map.empty<Nat, SocialMediaLink>();
    var contactInfos = Map.empty<Nat, ContactInfo>();
    var settings = Map.empty<Nat, Setting>();
    var heroVideos = Map.empty<Nat, HeroVideo>();
  };

  // Initialize access control state
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  let userProfiles = Map.empty<Principal, UserProfile>();

  // Helper function to assert admin access
  func assertAdmin(caller : Principal) {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
  };

  // User Profile Functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    userProfiles.add(caller, profile);
  };

  // Church CRUD Operations
  public shared ({ caller }) func addChurch(church : Church) : async Nat {
    
    let id = state.churchIdGen.nextId;
    state.churchIdGen.nextId += 1;
    let newChurch : Church = {
      church with
      id;
    };
    state.churches.add(id, newChurch);
    id;
  };

  public shared ({ caller }) func updateChurch(church : Church) : async () {
    
    if (not state.churches.containsKey(church.id)) {
      Runtime.trap("Church not found. ");
    };
    state.churches.add(church.id, church);
  };

  public shared ({ caller }) func deleteChurch(id : Nat) : async () {
    
    if (not state.churches.containsKey(id)) {
      Runtime.trap("Church not found. ");
    };
    state.churches.remove(id);
  };

  public query ({ caller }) func getChurchById(id : Nat) : async Church {
    // Guests can read
    switch (state.churches.get(id)) {
      case (null) { Runtime.trap("Church not found. ") };
      case (?church) { church };
    };
  };

  public query ({ caller }) func getAllChurches() : async [Church] {
    // Guests can read
    state.churches.values().toArray();
  };

  // Event CRUD Operations
  public shared ({ caller }) func addEvent(event : Event) : async Nat {
    
    let id = state.eventIdGen.nextId;
    state.eventIdGen.nextId += 1;
    let newEvent : Event = {
      event with
      id;
      createdAt = getCurrentTime();
      isPublished = false;
    };
    state.events.add(id, newEvent);
    id;
  };

  public shared ({ caller }) func updateEvent(event : Event) : async () {
    
    if (not state.events.containsKey(event.id)) {
      Runtime.trap("Event not found. ");
    };
    state.events.add(event.id, event);
  };

  public shared ({ caller }) func deleteEvent(id : Nat) : async () {
    
    if (not state.events.containsKey(id)) {
      Runtime.trap("Event not found. ");
    };
    state.events.remove(id);
  };

  public query ({ caller }) func getEventById(id : Nat) : async Event {
    // Guests can read
    switch (state.events.get(id)) {
      case (null) { Runtime.trap("Event not found. ") };
      case (?event) { event };
    };
  };

  public query ({ caller }) func getAllEvents() : async [Event] {
    // Guests can read
    state.events.values().toArray().sort(compareByEventDateTime<Event>(func(e) { e.dateTime }));
  };

  // Education Post CRUD Operations
  public shared ({ caller }) func addEducationPost(post : EducationPost) : async Nat {
    
    let id = state.eduPostIdGen.nextId;
    state.eduPostIdGen.nextId += 1;
    let newPost : EducationPost = {
      post with
      id;
      isPublished = false;
    };
    state.educationPosts.add(id, newPost);
    id;
  };

  public shared ({ caller }) func updateEducationPost(post : EducationPost) : async () {
    
    if (not state.educationPosts.containsKey(post.id)) {
      Runtime.trap("EducationPost not found. ");
    };
    state.educationPosts.add(post.id, post);
  };

  public shared ({ caller }) func deleteEducationPost(id : Nat) : async () {
    
    if (not state.educationPosts.containsKey(id)) {
      Runtime.trap("EducationPost not found. ");
    };
    state.educationPosts.remove(id);
  };

  public query ({ caller }) func getEducationPostById(id : Nat) : async EducationPost {
    // Guests can read
    switch (state.educationPosts.get(id)) {
      case (null) { Runtime.trap("EducationPost not found. ") };
      case (?post) { post };
    };
  };

  public query ({ caller }) func getAllEducationPosts() : async [EducationPost] {
    // Guests can read
    state.educationPosts.values().toArray().sort(compareByPublishedAt<EducationPost>(func(p) { p.publishedAt }));
  };

  // Bilingual-specific EducationPosts function
  public query ({ caller }) func getEducationPostsByLanguage(isArabic : Bool) : async [(Text, Text, ?[Text], Text)] {
    // Guests can read
    state.educationPosts.values().map(func(post) {
      if (isArabic) {
        (post.titleAr, post.contentAr, ?post.mediaUrls, "ar");
      } else {
        (post.titleEn, post.contentEn, ?post.mediaUrls, "en");
      };
    }).toArray();
  };

  // Vision Content CRUD Operations
  public shared ({ caller }) func addVisionContent(content : VisionContents) : async () {
    
    state.visionContent.add(content.sectionKey, content);
  };

  public shared ({ caller }) func updateVisionContent(content : VisionContents) : async () {
    
    if (not state.visionContent.containsKey(content.sectionKey)) {
      Runtime.trap("VisionContent not found. ");
    };
    state.visionContent.add(content.sectionKey, content);
  };

  public shared ({ caller }) func deleteVisionContent(sectionKey : Text) : async () {
    
    if (not state.visionContent.containsKey(sectionKey)) {
      Runtime.trap("VisionContent not found. ");
    };
    state.visionContent.remove(sectionKey);
  };

  public query ({ caller }) func getVisionContentBySectionKey(sectionKey : Text) : async VisionContents {
    // Guests can read
    switch (state.visionContent.get(sectionKey)) {
      case (null) { Runtime.trap("VisionContent not found. ") };
      case (?content) { content };
    };
  };

  public query ({ caller }) func getAllVisionContent() : async [VisionContents] {
    // Guests can read
    state.visionContent.values().toArray().sort(compareByOrder<VisionContents>(func(c) { c.order }));
  };

  // Team CRUD Operations (missing in original, adding for completeness)
  public shared ({ caller }) func addTeam(team : Team) : async Nat {
    
    let id = state.teamIdGen.nextId;
    state.teamIdGen.nextId += 1;
    let newTeam : Team = {
      team with
      id;
    };
    state.teams.add(id, newTeam);
    id;
  };

  public shared ({ caller }) func updateTeam(team : Team) : async () {
    
    if (not state.teams.containsKey(team.id)) {
      Runtime.trap("Team not found. ");
    };
    state.teams.add(team.id, team);
  };

  public shared ({ caller }) func deleteTeam(id : Nat) : async () {
    
    if (not state.teams.containsKey(id)) {
      Runtime.trap("Team not found. ");
    };
    state.teams.remove(id);
  };

  public query ({ caller }) func getTeamById(id : Nat) : async Team {
    // Guests can read
    switch (state.teams.get(id)) {
      case (null) { Runtime.trap("Team not found. ") };
      case (?team) { team };
    };
  };

  public query ({ caller }) func getAllTeams() : async [Team] {
    // Guests can read
    state.teams.values().toArray().sort(compareByOrder<Team>(func(t) { t.order }));
  };

  // Is Admin Check
  public query ({ caller }) func isAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  func getCurrentTime() : Int {
    0;
  };
};
