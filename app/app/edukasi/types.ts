export {youtubeId as youtubeIdFromUrl} from "@/lib/education";
export type EducationArticle = {id:string;title:string;excerpt:string;content:string|null;category:string;coverUrl:string|null;premium:boolean;locked:boolean};
export type EducationVideo = {id:string;title:string;youtubeId:string|null;category:string;description:string;premium:boolean;locked:boolean};
