// lib/schema.ts  — ESQUEMA ÚNICO Y LIMPIO (Drizzle + SQLite/D1)

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

// ===== Admin / Sesiones =====
export const adminUser = sqliteTable('admin_user', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('ADMIN'),
  lastLoginAt: integer('last_login_at'), // epoch seconds
  failedLoginCount: integer('failed_login_count').default(0),
  lockedUntil: integer('locked_until'), // epoch seconds
  createdAt: integer('created_at'),
  updatedAt: integer('updated_at'),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  adminUserId: text('admin_user_id')
    .notNull()
    .references(() => adminUser.id),
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: integer('created_at'),
  expiresAt: integer('expires_at').notNull(),
  rotatedFromId: text('rotated_from_id'),
  ip: text('ip'),
  userAgent: text('user_agent'),
});

// ===== Catálogo: categorías / subcategorías =====
export const category = sqliteTable('category', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: integer('created_at'),
  updatedAt: integer('updated_at'),
});

export const subcategory = sqliteTable('subcategory', {
  id: text('id').primaryKey(),
  categoryId: text('category_id')
    .notNull()
    .references(() => category.id),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: integer('created_at'),
  updatedAt: integer('updated_at'),
});

// ===== Productos =====
export const product = sqliteTable('product', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  priceCents: integer('price_cents'), // precio en centavos, null si no aplica
  sku: text('sku'),
  status: text('status').notNull().default('ACTIVE'), // ACTIVE | DRAFT
  categoryId: text('category_id')
    .notNull()
    .references(() => category.id),
  subcategoryId: text('subcategory_id').references(() => subcategory.id),
  createdAt: integer('created_at'),
  updatedAt: integer('updated_at'),
});

export const productImage = sqliteTable('product_image', {
  id: text('id').primaryKey(),
  productId: text('product_id')
    .notNull()
    .references(() => product.id),
  url: text('url').notNull(),
  alt: text('alt'),
  order: integer('order').default(0),
});

// ===== Tags (opcional) =====
export const tag = sqliteTable('tag', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
});

export const productTag = sqliteTable('product_tag', {
  productId: text('product_id')
    .notNull()
    .references(() => product.id),
  tagId: text('tag_id')
    .notNull()
    .references(() => tag.id),
});

// ===== Banners =====
export const banner = sqliteTable('banner', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  imageUrl: text('image_url').notNull(),
  link: text('link'),
  active: integer('active').notNull().default(1), // 1/0
  order: integer('order').notNull().default(0),
  createdAt: integer('created_at'),
  updatedAt: integer('updated_at'),
});

// ===== Ofertas =====
export const offer = sqliteTable('offer', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  discountType: text('discount_type').notNull(), // PERCENT | AMOUNT
  discountValue: integer('discount_value').notNull(),
  startAt: integer('start_at'),
  endAt: integer('end_at'),
  productId: text('product_id'),
  categoryId: text('category_id'),
  tagId: text('tag_id'),
});

// ===== Tipos útiles =====
export type AdminUser = InferSelectModel<typeof adminUser>;
export type Category = InferSelectModel<typeof category>;
export type Subcategory = InferSelectModel<typeof subcategory>;
export type Product = InferSelectModel<typeof product>;
export type ProductImage = InferSelectModel<typeof productImage>;
export type Banner = InferSelectModel<typeof banner>;
export type Offer = InferSelectModel<typeof offer>;
