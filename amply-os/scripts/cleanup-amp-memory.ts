import prisma from "../src/lib/prisma";

function pickLatest(rows: any[]) {
  return rows
    .slice()
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))[0];
}

async function main() {
  // Ensure all rows have mode
  await prisma.ampMemory.updateMany({
    where: { mode: null as any },
    data: { mode: "student" },
  });

  // Load all
  const rows = await prisma.ampMemory.findMany({
    orderBy: { updatedAt: "desc" },
  });

  // Group by (mode,type,key) AFTER canonicalization-like grouping
  const map = new Map<string, any[]>();
  for (const r of rows) {
    const mode = r.mode || "student";
    const key = `${mode}||${r.type}||${r.key}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }

  // If multiple per key, keep latest and delete others
  let deleted = 0;
  for (const [k, group] of map.entries()) {
    if (group.length <= 1) continue;

    const keep = pickLatest(group);
    const toDelete = group.filter((x) => x.id !== keep.id);

    await prisma.ampMemory.deleteMany({
      where: { id: { in: toDelete.map((x) => x.id) } },
    });

    deleted += toDelete.length;
  }

  console.log(`Cleanup done. Deleted duplicates: ${deleted}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
