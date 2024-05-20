import { PageHeader } from "@/frontend/app/admin/_components/page-header";
import { ProductForm } from "../../_components/productForm";
import db from "@/frontend/db/db";

export default async function NewProductPage({
  params: { id },
}: {
  params: { id: string };
}) {
  const product = await db.products.findUnique({
    where: {
      id,
    },
  });
  return (
    <>
      <PageHeader>Edit Product</PageHeader>
      <ProductForm product={product} />
    </>
  );
}
