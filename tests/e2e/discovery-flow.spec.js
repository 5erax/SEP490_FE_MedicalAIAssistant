import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";
const dept="33333333-3333-4333-8333-333333333333";
const session="55555555-5555-4555-8555-555555555555";
const token="eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50In0.";
function facilities(count=25) { return Array.from({length:count}, (_,i)=>({
 id:String(i+1), facilityName:"Cơ sở " + String(i+1).padStart(2,"0"),
 address:"123 Đường kiểm thử, Quận thử nghiệm", latitude:10.77+i*0.00005,longitude:106.7+i*0.00005,
 averageRating:3+i*.07,reviewCount:i+1,isActive:true,facilityType:"Hospital",
 departments:[{departmentId:dept,departmentName:"Khoa Hô hấp"}]
})); }
async function setup(page, {count=25, clinical=false, items=facilities(count), apiError=false, mapError=false}={}) {
 await preparePage(page);
 await page.addInitScript(({token})=>localStorage.setItem("medimate.auth",JSON.stringify({accessToken:token,userId:"test",roles:["Patient"]})),{token});
 await page.route("https://basemaps.cartocdn.com/**",r=>mapError?r.abort():r.fulfill({json:{version:8,sources:{},layers:[]}}));
 await page.route("**/api/**", async r=>{
  const url=new URL(r.request().url());
  const json=data=>r.fulfill({json:{success:true,data}});
  if(url.pathname==="/api/medical-facilities/active") return apiError?r.fulfill({status:503,json:{success:false}}):json(items);
  if(url.pathname==="/api/medical-departments") return json([{id:dept,departmentName:"Khoa Hô hấp"}]);
  if(url.pathname.startsWith("/api/medical-facilities/")) return json(items.find(f=>url.pathname.endsWith("/"+f.id)));
  if(url.pathname.startsWith("/api/symptom-analysis/")) return json({sessionId:session,symptomText:"Ho kiểm thử",
    recommendedDepartment:{departmentId:dept,departmentName:"Khoa Hô hấp",reason:"Cúm"},
    diagnoses:[{id:"d",diseaseName:"Cúm",clinicalReasoning:"Giải thích kiểm thử từ phiên tư vấn.",pAGivenB:.35}],recommendedFacilities:items.slice(0,3)});
  if(url.pathname==="/api/facility-departments/active") return json(items.map(f=>({facilityId:f.id,departmentId:dept,departmentName:"Khoa Hô hấp"})));
  return json([]);
 });
 await page.goto("/map"+(clinical?"?source=clinical&sessionId="+session+"&facilityId=1":""));
}
test("direct entry shows five cards immediately and load more appends without duplicates",async({page})=>{
 await setup(page);
 await expect(page.locator(".facility-result-card")).toHaveCount(5);
 await expect(page.getByRole("button",{name:"Kết quả tư vấn",exact:true})).toHaveCount(0);
 await page.getByRole("button",{name:"Xem thêm 5 cơ sở"}).click();
 await expect(page.locator(".facility-result-card")).toHaveCount(10);
 expect(new Set(await page.locator(".facility-top strong").allTextContents()).size).toBe(10);
});
test("clinical entry ignores legacy first facility id and shows consultation outside the map",async({page})=>{
 await setup(page,{clinical:true});
 await expect(page.getByRole("heading",{name:"Kết quả tư vấn",exact:true})).toBeVisible();
 await expect(page.locator(".map-clinical-result-rail")).toHaveCount(0);
 await page.getByRole("button",{name:"Tìm cơ sở khám phù hợp"}).click();
 await expect(page.locator(".facility-result-card")).toHaveCount(5);
 await page.goBack();
 await expect(page.getByRole("heading",{name:"Kết quả tư vấn",exact:true})).toBeVisible();
});
test("filter draft cancel and no-op apply preserve result count",async({page})=>{
 await setup(page);
 await page.getByRole("button",{name:"Xem thêm 5 cơ sở"}).click();
 await page.getByRole("button",{name:"Điều chỉnh tìm kiếm"}).click();
 await page.getByLabel("Sắp xếp",{exact:true}).selectOption("rating");
 await page.getByRole("button",{name:"← Quay lại",exact:true}).click();
 await expect(page.locator(".facility-result-card")).toHaveCount(10);
 await page.getByRole("button",{name:"Điều chỉnh tìm kiếm"}).click();
 await page.getByRole("button",{name:"Áp dụng",exact:true}).click();
 await expect(page.locator(".facility-result-card")).toHaveCount(10);
});
test("ranking uses the complete catalog before selecting five",async({page})=>{
 await setup(page);
 await page.getByRole("button",{name:"Điều chỉnh tìm kiếm"}).click();
 await page.getByLabel("Sắp xếp",{exact:true}).selectOption("rating");
 await page.getByRole("button",{name:"Áp dụng",exact:true}).click();
 await expect(page.locator(".facility-top strong").first()).toHaveText("Cơ sở 25");
 await expect(page.locator(".facility-result-card")).toHaveCount(5);
});
test("near me automatically reaches first nonempty radius",async({page,context})=>{
 await context.grantPermissions(["geolocation"]); await context.setGeolocation({latitude:10.6,longitude:106.7,accuracy:30});
 await setup(page,{count:4});
 await page.getByRole("button",{name:"Dùng vị trí để tìm gần tôi"}).click();
 await expect(page.getByText("Trong 20 km",{exact:true})).toBeVisible();
 await expect(page.locator(".facility-result-card")).toHaveCount(4);
});
test("manual empty radius remains manual, denied GPS keeps list usable",async({page,context})=>{
 await context.grantPermissions(["geolocation"]); await context.setGeolocation({latitude:10.6,longitude:106.7});
 await setup(page,{count:4});
 await page.getByRole("button",{name:"Dùng vị trí để tìm gần tôi"}).click();
 await expect(page.getByText("Trong 20 km",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Điều chỉnh tìm kiếm"}).click();
 await page.getByLabel("Phạm vi",{exact:true}).selectOption("nearby");
 await page.getByLabel("Bán kính",{exact:true}).selectOption("5");
 await page.getByRole("button",{name:"Áp dụng",exact:true}).click();
 await expect(page.locator(".facility-result-card")).toHaveCount(0);
 await expect(page.getByText("Trong 5 km",{exact:true})).toBeVisible();
});
test("detail close restores loaded count and browser back returns the list",async({page})=>{
 await setup(page);
 await page.getByRole("button",{name:"Xem thêm 5 cơ sở"}).click();
 await page.getByRole("button",{name:"Xem thông tin Cơ sở 08",exact:true}).click();
 await expect(page.locator("#facility-detail-title")).toHaveText("Cơ sở 08");
 await page.getByRole("button",{name:"Đóng chi tiết",exact:true}).click();
 await expect(page.locator(".facility-result-card")).toHaveCount(10);
});
test("API failure is distinct from empty and map failure leaves the list available",async({page})=>{
 await setup(page,{mapError:true});
 await expect(page.locator(".facility-result-card")).toHaveCount(5);
 await expect(page.getByText("Chưa thể hiển thị bản đồ",{exact:true})).toBeVisible();
});
for (const width of [320,390,768,1024,1440,1920]) test("responsive one main scroll at "+width,async({page},info)=>{
 await page.setViewportSize({width,height:900});
 await setup(page);
 await expect(page.locator(".facility-result-card")).toHaveCount(5);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
 if(width<1024){
  await expect(page.locator(".map-stage")).toBeHidden();
  await page.getByRole("button",{name:"Bản đồ",exact:true}).click();
  await expect(page.locator(".clinic-sidebar")).toBeHidden();
  await page.getByRole("button",{name:"Danh sách",exact:true}).click();
 } else { await expect(page.locator(".facility-result-card").nth(1)).toBeInViewport({ratio:1}); }
 await page.screenshot({path:info.outputPath("discovery-"+width+".png")});
});
test("center on me owns the camera; load more and tabs do not move it",async({page,context})=>{
 await context.grantPermissions(["geolocation"]);
 await context.setGeolocation({latitude:10.6,longitude:106.7,accuracy:30});
 await setup(page,{clinical:true});
 await page.getByRole("button",{name:"Tìm cơ sở khám phù hợp"}).click();
 await page.getByRole("button",{name:"Dùng vị trí để tìm gần tôi"}).click();
 await expect(page.getByText("Trong 20 km",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Vị trí của tôi",exact:true}).click();
 const map=await page.locator(".map-stage").boundingBox();
 const user=page.locator(".user-marker");
 const position=async()=>{const box=await user.boundingBox();return {x:box.x+box.width/2,y:box.y+box.height/2};};
 await expect.poll(async()=>Math.abs((await position()).x-(map.x+map.width/2))).toBeLessThan(3);
 await expect.poll(async()=>Math.abs((await position()).y-(map.y+map.height/2))).toBeLessThan(3);
 await page.mouse.move(map.x+map.width*.55,map.height*.5);
 await page.mouse.down();
 await page.mouse.move(map.x+map.width*.65,map.height*.6,{steps:20});
 await page.evaluate(()=>new Promise(resolve=>{let n=20;function frame(){if(--n)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);}));
 await page.mouse.up();
 // Wait through MapLibre's inertial drag, then compare after unrelated UI changes.
 await page.evaluate(()=>new Promise(resolve=>{let n=60;function frame(){if(--n)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);}));
 const before=await position();
 await page.getByRole("button",{name:"Xem thêm 5 cơ sở",exact:true}).click();
 await page.getByRole("button",{name:"Kết quả tư vấn",exact:true}).click();
 await page.getByRole("button",{name:"Tìm cơ sở khám phù hợp"}).click();
 await expect(page.locator(".facility-result-card")).toHaveCount(10);
 const after=await position();
 expect(Math.abs(after.x-before.x),JSON.stringify({before,after,map,afterMap:await page.locator(".map-stage").boundingBox()})).toBeLessThan(3);
 expect(Math.abs(after.y-before.y)).toBeLessThan(3);
});
test("an explicit deep link opens a valid facility outside the visible catalog without adding a pin",async({page})=>{
 await setup(page);
 await page.route("**/api/medical-facilities/99",r=>r.fulfill({json:{success:true,data:{...facilities(1)[0],id:"99",facilityName:"Cơ sở liên kết"}}}));
 await page.goto("/map?panel=detail&facilityId=99");
 await expect(page.locator("#facility-detail-title")).toHaveText("Cơ sở liên kết");
 await expect(page.getByRole("button",{name:"Chọn Cơ sở liên kết trên bản đồ",exact:true})).toHaveCount(0);
});
test("an unavailable deep link explains the problem and keeps the catalog available",async({page})=>{
 await setup(page);
 await page.goto("/map?panel=detail&facilityId=missing");
 await expect(page.getByRole("alert")).toContainText("Không thể mở cơ sở từ liên kết này");
 await expect(page.locator(".facility-result-card")).toHaveCount(5);
});
test("a late detail response never replaces the newer selected facility",async({page})=>{
 await setup(page);
 let release;
 await page.route("**/api/medical-facilities/1",async r=>{
   await new Promise(resolve=>{release=resolve;});
   await r.fulfill({json:{success:true,data:{...facilities(1)[0],facilityName:"Phản hồi cũ"}}});
 });
 await page.getByRole("button",{name:"Xem thông tin Cơ sở 01",exact:true}).click();
 await expect.poll(()=>typeof release).toBe("function");
 await page.getByRole("button",{name:"Cơ sở y tế",exact:true}).click();
 await page.getByRole("button",{name:"Xem thông tin Cơ sở 02",exact:true}).click();
 await expect(page.locator("#facility-detail-title")).toHaveText("Cơ sở 02");
 release();
 await expect(page.locator("#facility-detail-title")).toHaveText("Cơ sở 02");
 await expect(page.getByText("Phản hồi cũ",{exact:true})).toHaveCount(0);
});
