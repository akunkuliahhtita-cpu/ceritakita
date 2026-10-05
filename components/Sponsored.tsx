import {activeSponsors} from "@/lib/sponsors";
import type {Placement} from "@/lib/sponsors-schema";
import SponsorCards from "./SponsorCards";
export default async function Sponsored({placement}:{placement:Placement}){return <SponsorCards sponsors={await activeSponsors(placement)}/>;}
