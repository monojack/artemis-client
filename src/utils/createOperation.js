import { createOperation as apolloCreateOperation, } from 'apollo-link/lib/linkUtils'
import { parseSourceOrDocument, } from 'artemis-utilities/es/asts/parseSourceOrDocument'

export function createOperation (
  sourceOrDocument,
  { variables = {}, context = {}, extensions = {}, operationName, } = {}
) {
  const query = parseSourceOrDocument(sourceOrDocument)
  return apolloCreateOperation(context, {
    query,
    variables,
    context,
    operationName,
  })
}
