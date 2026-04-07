export default function Pagination({
  page = 1,
  totalPages = 1,
  onPageChange,
}) {
  if (totalPages <= 1) return null;

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    onPageChange(nextPage);
  };

  const pages = [];
  for (let i = 1; i <= totalPages; i += 1) {
    pages.push(i);
  }

  return (
    <div className="pagination">
      <button
        type="button"
        className="button button--secondary"
        disabled={page <= 1}
        onClick={() => goToPage(page - 1)}
      >
        Previous
      </button>

      <div className="row">
        {pages.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            className={
              pageNumber === page
                ? "button"
                : "button button--secondary"
            }
            onClick={() => goToPage(pageNumber)}
          >
            {pageNumber}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="button button--secondary"
        disabled={page >= totalPages}
        onClick={() => goToPage(page + 1)}
      >
        Next
      </button>
    </div>
  );
}