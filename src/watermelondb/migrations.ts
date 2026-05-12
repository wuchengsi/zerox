import {
  addColumns,
  createTable,
  schemaMigrations,
} from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      // Add indexes to category_status and debtor_status for faster queries
      toVersion: 2,
      steps: [
        // Note: WatermelonDB doesn't have a direct "addIndex" migration step
        // The index will be applied automatically when the schema version changes
        // and the adapter recreates the indexes based on the updated schema
      ],
    },
    {
      toVersion: 3,
      steps: [
        addColumns({
          table: 'categories',
          columns: [
            {name: 'parent_id', type: 'string', isOptional: true, isIndexed: true},
            {name: 'kind', type: 'string', isIndexed: true},
          ],
        }),
        createTable({
          name: 'incomes',
          columns: [
            {name: 'title', type: 'string'},
            {name: 'amount', type: 'number'},
            {name: 'category_id', type: 'string', isIndexed: true},
            {name: 'user_id', type: 'string', isIndexed: true},
            {name: 'date', type: 'string', isIndexed: true},
          ],
        }),
      ],
    },
  ],
});

export default migrations;
