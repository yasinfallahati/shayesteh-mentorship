import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { migrateCourseTracks } from "@/lib/db";

function oldDatabase() {
  const database = new Database(":memory:");
  database.pragma("foreign_keys = ON");
  database.exec(`
    CREATE TABLE tracks (id INTEGER PRIMARY KEY);
    CREATE TABLE courses (
      id INTEGER PRIMARY KEY,
      track_id INTEGER NOT NULL REFERENCES tracks(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      position INTEGER NOT NULL
    );
    CREATE INDEX courses_track ON courses(track_id, position);
    CREATE TABLE track_courses (
      track_id INTEGER NOT NULL REFERENCES tracks(id),
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      PRIMARY KEY (track_id, course_id)
    );
    CREATE TABLE videos (id INTEGER PRIMARY KEY, course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE);
    INSERT INTO tracks VALUES (1), (2);
    INSERT INTO courses VALUES (10, 1, 'Python', 'intro', 0), (11, 2, 'Docker', '', 3);
    INSERT INTO videos VALUES (100, 10), (101, 11);
  `);
  return database;
}

describe("migrateCourseTracks", () => {
  it("moves track links into track_courses and keeps the order", () => {
    const database = oldDatabase();
    migrateCourseTracks(database);
    expect(database.prepare("SELECT * FROM track_courses ORDER BY course_id").all()).toEqual([
      { track_id: 1, course_id: 10, position: 0 },
      { track_id: 2, course_id: 11, position: 3 },
    ]);
  });

  it("removes track_id and keeps course ids, titles and descriptions", () => {
    const database = oldDatabase();
    migrateCourseTracks(database);
    expect(database.prepare("SELECT * FROM courses ORDER BY id").all()).toEqual([
      { id: 10, title: "Python", description: "intro" },
      { id: 11, title: "Docker", description: "" },
    ]);
  });

  it("does not delete videos and leaves foreign keys working", () => {
    const database = oldDatabase();
    migrateCourseTracks(database);
    expect(database.prepare("SELECT COUNT(*) AS total FROM videos").get()).toEqual({ total: 2 });
    expect(database.pragma("foreign_keys", { simple: true })).toBe(1);
    database.prepare("DELETE FROM courses WHERE id = 10").run();
    expect(database.prepare("SELECT id FROM videos").all()).toEqual([{ id: 101 }]);
    expect(database.prepare("SELECT course_id FROM track_courses").all()).toEqual([{ course_id: 11 }]);
  });

  it("does nothing on an already migrated database", () => {
    const database = oldDatabase();
    migrateCourseTracks(database);
    migrateCourseTracks(database);
    expect(database.prepare("SELECT COUNT(*) AS total FROM track_courses").get()).toEqual({ total: 2 });
  });
});
