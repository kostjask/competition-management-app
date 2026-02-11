import { prisma } from "../src/db/prisma";

async function main() {
  console.log("🌱 Seeding database...\n");

  // 1. Create permissions
  console.log("Creating permissions...");
  const permissions = await Promise.all([
    prisma.permission.upsert({
      where: { key: "event.manage" },
      update: {},
      create: {
        key: "event.manage",
        name: "Manage Events",
        description: "Create, edit, and delete events",
      },
    }),
    prisma.permission.upsert({
      where: { key: "studio.manage" },
      update: {},
      create: {
        key: "studio.manage",
        name: "Manage Studios",
        description: "Manage studio information",
      },
    }),
    prisma.permission.upsert({
      where: { key: "dancer.manage" },
      update: {},
      create: {
        key: "dancer.manage",
        name: "Manage Dancers",
        description: "Add, edit, and remove dancers",
      },
    }),
    prisma.permission.upsert({
      where: { key: "performance.manage" },
      update: {},
      create: {
        key: "performance.manage",
        name: "Manage Performances",
        description: "Register and manage performances",
      },
    }),
    prisma.permission.upsert({
      where: { key: "event.register" },
      update: {},
      create: {
        key: "event.register",
        name: "Register for Events",
        description: "Register studios for events",
      },
    }),
    prisma.permission.upsert({
      where: { key: "score.submit" },
      update: {},
      create: {
        key: "score.submit",
        name: "Submit Scores",
        description: "Submit performance scores",
      },
    }),
  ]);
  console.log(`✅ Created ${permissions.length} permissions\n`);

  // 2. Create roles
  console.log("Creating roles...");
  const adminRole = await prisma.role.upsert({
    where: { key: "admin" },
    update: {},
    create: {
      key: "admin",
      name: "Administrator",
      description: "Full system access",
    },
  });

  const representativeRole = await prisma.role.upsert({
    where: { key: "representative" },
    update: {},
    create: {
      key: "representative",
      name: "Studio Representative",
      description: "Manages studio dancers and performances",
    },
  });

  const judgeRole = await prisma.role.upsert({
    where: { key: "judge" },
    update: {},
    create: {
      key: "judge",
      name: "Judge",
      description: "Scores performances",
    },
  });

  const moderatorRole = await prisma.role.upsert({
    where: { key: "moderator" },
    update: {},
    create: {
      key: "moderator",
      name: "Moderator",
      description: "Controls stage flow and validates scores",
    },
  });
  console.log("✅ Created 4 roles\n");

  // 3. Assign permissions to roles
  console.log("Assigning permissions to roles...");
  const rolePermissions = [
    // Admin - all permissions
    { roleId: adminRole.id, permissionId: permissions[0].id },
    { roleId: adminRole.id, permissionId: permissions[1].id },
    { roleId: adminRole.id, permissionId: permissions[2].id },
    { roleId: adminRole.id, permissionId: permissions[3].id },
    { roleId: adminRole.id, permissionId: permissions[4].id },
    { roleId: adminRole.id, permissionId: permissions[5].id },

    // Representative
    { roleId: representativeRole.id, permissionId: permissions[1].id }, // studio.manage
    { roleId: representativeRole.id, permissionId: permissions[2].id }, // dancer.manage
    { roleId: representativeRole.id, permissionId: permissions[3].id }, // performance.manage
    { roleId: representativeRole.id, permissionId: permissions[4].id }, // event.register

    // Judge
    { roleId: judgeRole.id, permissionId: permissions[5].id }, // score.submit

    // Moderator
    { roleId: moderatorRole.id, permissionId: permissions[5].id }, // score.submit (to view)
  ];

  for (const rp of rolePermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: rp.roleId,
          permissionId: rp.permissionId,
        },
      },
      update: {},
      create: rp,
    });
  }
  console.log("✅ Assigned permissions to roles\n");

  // 4. Create test users
  console.log("Creating test users...");
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: {},
    create: {
      email: "admin@test.com",
      name: "Admin User",
    },
  });

  const repUser = await prisma.user.upsert({
    where: { email: "rep@test.com" },
    update: {},
    create: {
      email: "rep@test.com",
      name: "Representative User",
    },
  });

  const judgeUser = await prisma.user.upsert({
    where: { email: "judge@test.com" },
    update: {},
    create: {
      email: "judge@test.com",
      name: "Judge User",
    },
  });
  console.log("✅ Created 3 test users\n");

  // 5. Assign roles to users
  console.log("Assigning roles to users...");

  // Admin role (global)
  const existingAdminRole = await prisma.userRole.findFirst({
    where: {
      userId: adminUser.id,
      roleId: adminRole.id,
      eventId: null,
    },
  });
  if (!existingAdminRole) {
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: adminRole.id,
        eventId: null,
      },
    });
  }

  // Representative role (global)
  const existingRepRole = await prisma.userRole.findFirst({
    where: {
      userId: repUser.id,
      roleId: representativeRole.id,
      eventId: null,
    },
  });
  if (!existingRepRole) {
    await prisma.userRole.create({
      data: {
        userId: repUser.id,
        roleId: representativeRole.id,
        eventId: null,
      },
    });
  }

  // Judge role (global)
  const existingJudgeRole = await prisma.userRole.findFirst({
    where: {
      userId: judgeUser.id,
      roleId: judgeRole.id,
      eventId: null,
    },
  });
  if (!existingJudgeRole) {
    await prisma.userRole.create({
      data: {
        userId: judgeUser.id,
        roleId: judgeRole.id,
        eventId: null,
      },
    });
  }
  console.log("✅ Assigned roles to users\n");

  // 6. Create test event
  console.log("Creating test event...");
  const event = await prisma.event.upsert({
    where: { id: "test-event-2026" },
    update: {},
    create: {
      id: "test-event-2026",
      name: "Winter Championship 2026",
      startsAt: new Date("2026-03-01T09:00:00Z"),
      endsAt: new Date("2026-03-03T18:00:00Z"),
      stage: "PRE_REGISTRATION",
    },
  });
  console.log(`✅ Created event: ${event.name}\n`);

  // 7. Create categories, age groups, formats for the event
  console.log("Creating event configuration...");

  const categories = await Promise.all([
    prisma.danceCategory.upsert({
      where: {
        eventId_name: { eventId: event.id, name: "Contemporary" },
      },
      update: {},
      create: {
        eventId: event.id,
        name: "Contemporary",
      },
    }),
    prisma.danceCategory.upsert({
      where: {
        eventId_name: { eventId: event.id, name: "Hip-Hop" },
      },
      update: {},
      create: {
        eventId: event.id,
        name: "Hip-Hop",
      },
    }),
    prisma.danceCategory.upsert({
      where: {
        eventId_name: { eventId: event.id, name: "Jazz" },
      },
      update: {},
      create: {
        eventId: event.id,
        name: "Jazz",
      },
    }),
  ]);

  const ageGroups = await Promise.all([
    prisma.ageGroup.create({
      data: {
        eventId: event.id,
        name: "Kids (6-10)",
        minAge: 6,
        maxAge: 10,
      },
    }),
    prisma.ageGroup.create({
      data: {
        eventId: event.id,
        name: "Juniors (11-15)",
        minAge: 11,
        maxAge: 15,
      },
    }),
    prisma.ageGroup.create({
      data: {
        eventId: event.id,
        name: "Seniors (16+)",
        minAge: 16,
        maxAge: null,
      },
    }),
  ]);

  const formats = await Promise.all([
    prisma.danceFormat.create({
      data: {
        eventId: event.id,
        name: "Solo",
        minParticipants: 1,
        maxParticipants: 1,
        maxDurationSeconds: 180, // 3 min
      },
    }),
    prisma.danceFormat.create({
      data: {
        eventId: event.id,
        name: "Duo",
        minParticipants: 2,
        maxParticipants: 2,
        maxDurationSeconds: 240, // 4 min
      },
    }),
    prisma.danceFormat.create({
      data: {
        eventId: event.id,
        name: "Group",
        minParticipants: 3,
        maxParticipants: 20,
        maxDurationSeconds: 300, // 5 min
      },
    }),
  ]);

  console.log(
    `✅ Created ${categories.length} categories, ${ageGroups.length} age groups, ${formats.length} formats\n`
  );

  // 8. Create a test studio with representative
  console.log("Creating test studio...");
  const studio = await prisma.studio.create({
    data: {
      eventId: event.id,
      name: "Tallinn Dance Academy",
      country: "Estonia",
      city: "Tallinn",
      directorName: "Maria Kask",
      directorPhone: "+372 5123 4567",
      representatives: {
        create: {
          userId: repUser.id,
          name: "Representative User",
          email: "rep@test.com",
        },
      },
      registrations: {
        create: {
          eventId: event.id,
          status: "PENDING",
        },
      },
    },
  });
  console.log(`✅ Created studio: ${studio.name}\n`);

  // Summary
  console.log("════════════════════════════════════════");
  console.log("🎉 Seeding Complete!");
  console.log("════════════════════════════════════════");
  console.log("\n📋 Test Credentials:\n");
  console.log(`Admin User:`);
  console.log(`  ID:    ${adminUser.id}`);
  console.log(`  Email: ${adminUser.email}\n`);
  console.log(`Representative User:`);
  console.log(`  ID:    ${repUser.id}`);
  console.log(`  Email: ${repUser.email}\n`);
  console.log(`Judge User:`);
  console.log(`  ID:    ${judgeUser.id}`);
  console.log(`  Email: ${judgeUser.email}\n`);
  console.log(`Event:`);
  console.log(`  ID:   ${event.id}`);
  console.log(`  Name: ${event.name}`);
  console.log(`  Stage: ${event.stage}\n`);
  console.log(`Studio:`);
  console.log(`  ID:   ${studio.id}`);
  console.log(`  Name: ${studio.name}`);
  console.log(`  Registration Status: PENDING\n`);
  console.log("════════════════════════════════════════\n");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });