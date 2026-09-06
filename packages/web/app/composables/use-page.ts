export const usePage = async () => {
  const route = useRoute();
  const { data: page } = await useAsyncData(route.path, () =>
    queryCollection("docs").path(route.path).first(),
  );
  return page;
};
