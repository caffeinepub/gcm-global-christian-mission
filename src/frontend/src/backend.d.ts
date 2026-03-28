import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Team {
    id: bigint;
    nameAr: string;
    nameEn: string;
    descriptionAr: string;
    descriptionEn: string;
    order: bigint;
    category: TeamsCategory;
    mediaUrls: Array<string>;
}
export interface Church {
    id: bigint;
    latitude: number;
    nameAr: string;
    nameEn: string;
    descriptionAr: string;
    descriptionEn: string;
    imageUrl?: string;
    addressAr: string;
    addressEn: string;
    longitude: number;
    image?: Image;
    phone: string;
}
export type Image = Uint8Array;
export interface Event {
    id: bigint;
    calendarLink?: string;
    descriptionAr: string;
    descriptionEn: string;
    isPublished: boolean;
    createdAt: bigint;
    imageUrl?: string;
    locationAr: string;
    locationEn: string;
    image?: Image;
    dateTime: bigint;
    titleAr: string;
    titleEn: string;
}
export interface EducationPost {
    id: bigint;
    postType: Variant_video_text_photo;
    contentAr: string;
    contentEn: string;
    isPublished: boolean;
    authorName: string;
    publishedAt: bigint;
    mediaUrls: Array<string>;
    image?: Image;
    titleAr: string;
    titleEn: string;
}
export interface VisionContents {
    order: bigint;
    bodyAr: string;
    bodyEn: string;
    sectionKey: string;
    titleAr: string;
    titleEn: string;
}
export interface UserProfile {
    name: string;
}
export enum TeamsCategory {
    ministry = "ministry",
    volunteers = "volunteers",
    choir = "choir",
    kids = "kids",
    youth = "youth"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_video_text_photo {
    video = "video",
    text = "text",
    photo = "photo"
}
export interface backendInterface {
    addChurch(church: Church): Promise<bigint>;
    addEducationPost(post: EducationPost): Promise<bigint>;
    addEvent(event: Event): Promise<bigint>;
    addTeam(team: Team): Promise<bigint>;
    addVisionContent(content: VisionContents): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteChurch(id: bigint): Promise<void>;
    deleteEducationPost(id: bigint): Promise<void>;
    deleteEvent(id: bigint): Promise<void>;
    deleteTeam(id: bigint): Promise<void>;
    deleteVisionContent(sectionKey: string): Promise<void>;
    getAllChurches(): Promise<Array<Church>>;
    getAllEducationPosts(): Promise<Array<EducationPost>>;
    getAllEvents(): Promise<Array<Event>>;
    getAllTeams(): Promise<Array<Team>>;
    getAllVisionContent(): Promise<Array<VisionContents>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChurchById(id: bigint): Promise<Church>;
    getEducationPostById(id: bigint): Promise<EducationPost>;
    getEducationPostsByLanguage(isArabic: boolean): Promise<Array<[string, string, Array<string> | null, string]>>;
    getEventById(id: bigint): Promise<Event>;
    getTeamById(id: bigint): Promise<Team>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVisionContentBySectionKey(sectionKey: string): Promise<VisionContents>;
    isAdmin(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateChurch(church: Church): Promise<void>;
    updateEducationPost(post: EducationPost): Promise<void>;
    updateEvent(event: Event): Promise<void>;
    updateTeam(team: Team): Promise<void>;
    updateVisionContent(content: VisionContents): Promise<void>;
}
