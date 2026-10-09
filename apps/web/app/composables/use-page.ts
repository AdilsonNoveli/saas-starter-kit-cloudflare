export const usePage = async () => {
  const route = useRoute();
  const { locale } = useI18n();
  const { data: page } = await useAsyncData(
    () => `${route.path}:${locale.value}`,
    () => queryDocsPage(locale.value, route.path),
  );
  return page;
};
