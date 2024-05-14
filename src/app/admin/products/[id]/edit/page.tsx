import { PageHeader } from "@/app/admin/_components/page-header";
import { ProductForm } from "../../_components/productForm";
import db from "@/db/db";

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
