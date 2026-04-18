import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reports, type NewReport } from "@/drizzle/schema";
import { eq, desc, and, like } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { logAction } from "@/lib/audit";
import { geocodeAddress } from "@/lib/geocode";

// GET - List reports with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const sessionId = searchParams.get("sessionId");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build query conditions
    const conditions = [];
    if (type) {
      conditions.push(eq(reports.type, type as any));
    }
    if (status) {
      conditions.push(eq(reports.status, status as any));
    }
    if (sessionId) {
      conditions.push(eq(reports.sessionId, sessionId));
    }

    // Execute query
    let query = db.select().from(reports);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const results = await query
      .orderBy(desc(reports.createdAt))
      .limit(limit);

    return NextResponse.json({ reports: results });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

// POST - Create a new report
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let {
      type,
      description,
      latitude,
      longitude,
      address,
      photoUrl,
      sessionId,
      severity,
      source,
    } = body;

    // Validation
    if (!type || !description || !address) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // If latitude/longitude not provided, geocode the address
    if (!latitude || !longitude) {
      try {
        const geocoded = await geocodeAddress(address);
        if (geocoded) {
          latitude = geocoded.lat;
          longitude = geocoded.lng;
        } else {
          // Default to Universidad de Antioquia (Ciudad Universitaria)
          latitude = 6.2676;
          longitude = -75.5685;
        }
      } catch {
        // Default to Universidad de Antioquia (Ciudad Universitaria)
        latitude = 6.2676;
        longitude = -75.5685;
      }
    }

    const validTypes = [
      "pothole",
      "noise",
      "parking",
      "graffiti",
      "streetlight",
      "sidewalk",
      "other",
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid issue type" }, { status: 400 });
    }

    const now = new Date();
    const id = uuidv4();

    const validSeverities = ["low", "medium", "high"];
    const reportSeverity = validSeverities.includes(severity) ? severity : "medium";

    const newReport: NewReport = {
      id,
      type,
      description,
      latitude,
      longitude,
      address,
      photoUrl: photoUrl || null,
      status: "new",
      severity: reportSeverity,
      sessionId: sessionId || null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(reports).values(newReport);

    // Log the action and get the hash
    const auditHash = await logAction("report", {
      reportId: id,
      type,
      address,
      hasPhoto: !!photoUrl,
      source: source || "web",
    });

    return NextResponse.json({
      success: true,
      report: newReport,
      auditHash,
      message: "Report submitted successfully"
    });
  } catch (error) {
    console.error("Error creating report:", error);
    return NextResponse.json(
      { error: "Failed to create report" },
      { status: 500 }
    );
  }
}
