import test from "node:test";
import assert from "node:assert/strict";
import {discoverFacilities, distanceFrom, clusterFacilities} from "../../src/utils/facilityDiscovery.js";
import {readJourney,saveJourney,clearJourneys} from "../../src/state/careJourneyState.js";
const f=(id,extra={})=>({facilityId:id,facilityName:"Cơ sở "+id,address:"A",isActive:true,hasValidCoordinates:true,latitude:0,longitude:.17,departmentIds:["d"],facilityTypeKey:"hospital",averageRating:4,reviewCount:2,...extra});
test("auto stops at 20km with four results, never widens to fill five",()=>{
 const result=discoverFacilities([f("1"),f("2"),f("3"),f("4"),f("far",{longitude:.22})],{location:{lat:0,lng:0},mode:"auto"});
 assert.equal(result.radius,20);assert.equal(result.items.length,4);
});
test("manual radius never widens and missing coordinates stay in unlimited only",()=>{
 const items=[f("a"),f("b",{hasValidCoordinates:false})];
 assert.equal(discoverFacilities(items,{location:{lat:0,lng:0},mode:"nearby",radiusKm:5}).items.length,0);
 assert.equal(discoverFacilities(items).items.length,2);
});
test("rating ranks the entire filtered catalog, not its first twenty rows",()=>{
 const items=Array.from({length:30},(_,i)=>f(String(i),{averageRating:3+i/20}));
 const ranked=discoverFacilities(items,{departmentId:"d",sort:"rating"}).items;
 assert.deepEqual(ranked.slice(0,5).map(f=>f.facilityId),["29","28","27","26","25"]);
 assert.equal(new Set(ranked.map(f=>f.facilityId)).size,30);
});
test("search, specialty and type precede radius selection",()=>{
 const result=discoverFacilities([f("other",{longitude:.01,departmentIds:["x"]}),f("match",{longitude:.17})],
 {location:{lat:0,lng:0},mode:"auto",departmentId:"d",type:"hospital",search:"co so match"});
 assert.equal(result.radius,20); assert.equal(result.items[0].facilityId,"match");
});
test("rating count breaks ties; invalid ratings cannot outrank verified reviews",()=>{
 const result=discoverFacilities([f("bad",{averageRating:99}),f("few",{reviewCount:1}),f("many",{reviewCount:5}),f("zero",{averageRating:5,reviewCount:0})]);
 assert.deepEqual(result.items.slice(0,2).map(f=>f.facilityId),["many","few"]);
});
test("no location removes geographic claims and nearest falls back to names",()=>{
 const result=discoverFacilities([f("b"),f("a")],{mode:"auto",sort:"nearest"});
 assert.equal(result.radius,null);assert.equal(result.sortLabel,"Tên cơ sở A–Z");
 assert.equal(result.items[0].distanceKm,null);
});
test("distance comparison is unrounded at the boundary",()=>{
 const item=f("a"); const distance=distanceFrom({lat:0,lng:0},item);
 assert.equal(discoverFacilities([item],{location:{lat:0,lng:0},mode:"nearby",radiusKm:distance-.000001}).items.length,0);
 assert.equal(discoverFacilities([item],{location:{lat:0,lng:0},mode:"nearby",radiusKm:distance}).items.length,1);
});
test("clustering represents exactly the supplied visible IDs",()=>{
 const result=clusterFacilities([f("a"),f("b")],10);
 assert.equal(result.length,1);assert.deepEqual(result[0].ids,["a","b"]);
});
test("memory-only drafts survive same-account route changes but never account switches",()=>{
 clearJourneys();saveJourney("A","draft",{symptoms:"fixture"});
 assert.equal(readJourney("A","draft").symptoms,"fixture");
 assert.equal(readJourney("B","draft"),null);assert.equal(readJourney("A","draft"),null);
});
