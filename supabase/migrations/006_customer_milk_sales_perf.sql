create index if not exists idx_customers_created_by on public.customers(created_by);
create index if not exists idx_customer_deliveries_created_by on public.customer_milk_deliveries(created_by);
create index if not exists idx_customer_payments_created_by on public.customer_payments(created_by);

drop policy if exists "customer_deliveries_authenticated_insert" on public.customer_milk_deliveries;
create policy "customer_deliveries_authenticated_insert"
on public.customer_milk_deliveries
for insert to authenticated
with check ((select auth.uid()) is not null);
