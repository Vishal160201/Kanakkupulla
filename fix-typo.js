async function main() {
  const res = await fetch("http://localhost:3000/api/settings/layouts");
  const layouts = await res.json();
  const giftLayout = layouts.find(l => l.formKey === "GIFT_ORDER_FORM");
  if (!giftLayout) return console.log("Not found");
  
  giftLayout.schema.sections.forEach(sec => {
    sec.fields.forEach(f => {
      if (f.name.toUpperCase() === "REFERANCE IMAGE") {
        f.name = "Reference Image";
      }
    });
  });

  const putRes = await fetch("http://localhost:3000/api/settings/layouts", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(giftLayout)
  });
  console.log("Status:", putRes.status);
}
main();
