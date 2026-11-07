/**
 * An open transaction, opaque outside infrastructure: repository ports in
 * <context>/domain/ can take it as a parameter, and only the Prisma
 * repositories turn it back into a database client (prismaTransaction).
 */
export interface Transaction {
  readonly __transaction: unique symbol;
}
